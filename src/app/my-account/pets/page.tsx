"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Dog, Cat, Plus, MoreHorizontal, Pencil, Trash2, Camera, ClipboardList, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { Pet } from "@/types/models";
import { AGE_LABEL, ALLERGY_OPTIONS, BREED_SUGGESTIONS, PREFERENCE_OPTIONS } from "@/lib/petOptions";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// Gói còn hiệu lực: chặn xóa bé và hiện "Đang có gói"
const ACTIVE_SUB_STATUSES = ["cho_thanh_toan", "dang_hoat_dong", "tam_dung", "qua_han"] as const;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

interface PetSubInfo {
  planName: string;
  totalCycles: number;
  remaining: number;
}

type PetFormValue = Omit<Pet, "id" | "avatarColor" | "avatarPath" | "ageLabel" | "size" | "weight"> & { weight: string };

const emptyForm = (): PetFormValue => ({
  name: "",
  species: "dog",
  breed: "",
  weight: "",
  ageGroup: "adult",
  gender: "Đực",
  birthdate: "",
  allergies: [],
  preferences: [],
  notes: "",
});

export default function MyPetsPage() {
  const { pets, addPet, updatePet, deletePet, isLoadingAuth, user } = useApp();
  const { show } = useToast();

  const [boxesReceived, setBoxesReceived] = useState<Record<string, number>>({});
  const [activeSubs, setActiveSubs] = useState<Record<string, PetSubInfo>>({});
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Pet | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // Số hộp đã giao theo bé: đơn Box mua lẻ (order_items.pet_id) + đơn kỳ của gói (subscriptions.pet_id)
  const loadStats = useCallback(async () => {
    if (!user.id) return;
    const supabase = createClient();
    const [{ data: orders }, { data: subs }] = await Promise.all([
      supabase
        .from("orders")
        .select("order_type, order_items(pet_id, box_type_id), subscriptions(pet_id)")
        .eq("status", "da_giao")
        .in("order_type", ["mystery_box", "subscription_cycle"]),
      supabase
        .from("subscriptions")
        .select("pet_id, total_cycles, remaining_cycles, status, subscription_plans(name)")
        .in("status", ACTIVE_SUB_STATUSES),
    ]);
    const counts: Record<string, number> = {};
    (orders as unknown as { order_type: string; order_items: { pet_id: string | null; box_type_id: string | null }[]; subscriptions: { pet_id: string } | null }[] | null)?.forEach((o) => {
      if (o.order_type === "subscription_cycle" && o.subscriptions) {
        counts[o.subscriptions.pet_id] = (counts[o.subscriptions.pet_id] || 0) + 1;
      } else {
        o.order_items.filter((i) => i.box_type_id && i.pet_id).forEach((i) => {
          counts[i.pet_id!] = (counts[i.pet_id!] || 0) + 1;
        });
      }
    });
    setBoxesReceived(counts);
    const subMap: Record<string, PetSubInfo> = {};
    (subs as unknown as { pet_id: string; total_cycles: number; remaining_cycles: number; subscription_plans: { name: string } | null }[] | null)?.forEach((s) => {
      subMap[s.pet_id] = { planName: s.subscription_plans?.name || `Gói ${s.total_cycles} hộp`, totalCycles: s.total_cycles, remaining: s.remaining_cycles };
    });
    setActiveSubs(subMap);
  }, [user.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Ảnh bé nằm ở bucket riêng tư nên phải xin signed URL để hiển thị
  useEffect(() => {
    const paths = pets.map((p) => p.avatarPath).filter((p): p is string => !!p);
    if (paths.length === 0) return;
    createClient()
      .storage.from("pet-avatars")
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach((d) => {
          if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
        });
        setAvatarUrls(map);
      });
  }, [pets]);

  const editingPet = pets.find((p) => p.id === editingId) || null;

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deletePet(deleting.id);
      show(`Đã xóa hồ sơ bé ${deleting.name}`);
      setDeleting(null);
    } catch {
      show("Không xóa được hồ sơ, vui lòng thử lại.", { tone: "error" });
    } finally {
      setDeleteBusy(false);
    }
  };

  const ready = !isLoadingAuth;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-pine-950">Hồ sơ thú cưng</h2>
          <p className="text-xs text-bark-500">Thông tin của bé giúp FPETS chọn đúng món và tránh thành phần bé bị dị ứng.</p>
        </div>
        <div className="relative">
          <Button onClick={() => setAddChooserOpen((v) => !v)} disabled={!ready} aria-expanded={addChooserOpen}>
            <Plus className="w-4 h-4" />
            <span>Thêm bé</span>
          </Button>
          {addChooserOpen && (
            <div className="absolute right-0 mt-2 w-64 z-30 rounded-box bg-surface-card border border-surface-border shadow-xl p-1.5 text-sm">
              <button
                type="button"
                onClick={() => {
                  setAddChooserOpen(false);
                  setEditingId(null);
                  setFormMode("add");
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-box hover:bg-surface-muted text-left"
              >
                <Zap className="w-4 h-4 mt-0.5 text-pine-800 shrink-0" />
                <span>
                  <span className="block font-bold text-pine-950">Nhập nhanh</span>
                  <span className="block text-xs text-bark-500">Điền thông tin bé trong một form</span>
                </span>
              </button>
              <Link href="/quiz" className="flex items-start gap-2.5 p-2.5 rounded-box hover:bg-surface-muted">
                <ClipboardList className="w-4 h-4 mt-0.5 text-pine-800 shrink-0" />
                <span>
                  <span className="block font-bold text-pine-950">Làm Pet Quiz</span>
                  <span className="block text-xs text-bark-500">5 câu hỏi, kèm gợi ý hộp phù hợp</span>
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {pets.length === 0 && ready && (
        <div className="p-8 rounded-container bg-surface-card border border-dashed border-surface-border text-center space-y-3">
          <p className="text-sm text-bark-600">Bạn chưa có hồ sơ thú cưng nào.</p>
          <ButtonLink href="/quiz" variant="accent">Làm Pet Quiz</ButtonLink>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pets.map((pet) => {
          const sub = activeSubs[pet.id];
          const avatarUrl = pet.avatarPath ? avatarUrls[pet.avatarPath] : undefined;
          return (
            <div key={pet.id} className="p-5 rounded-container bg-surface-card border border-surface-border flex flex-col justify-between gap-4 shadow-xs">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-14 h-14 rounded-box overflow-hidden flex items-center justify-center border border-black/5 shrink-0" style={{ backgroundColor: pet.avatarColor }}>
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={`Ảnh bé ${pet.name}`} fill sizes="56px" className="object-cover" unoptimized />
                      ) : pet.species === "dog" ? (
                        <Dog className="w-7 h-7 text-pine-900" />
                      ) : (
                        <Cat className="w-7 h-7 text-pine-900" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
                        <span className="truncate">{pet.name}</span>
                        <span className={pet.gender === "Cái" ? "text-pink-600" : "text-sky-700"} aria-label={pet.gender} title={pet.gender}>
                          {pet.gender === "Cái" ? "♀" : "♂"}
                        </span>
                      </h3>
                      <p className="text-xs text-bark-600">
                        {[pet.breed, pet.weight ? `${pet.weight} kg` : "", pet.ageLabel].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <IconButton label="Tùy chọn hồ sơ" onClick={() => setMenuFor(menuFor === pet.id ? null : pet.id)} disabled={!ready}>
                      <MoreHorizontal className="w-5 h-5" />
                    </IconButton>
                    {menuFor === pet.id && (
                      <div className="absolute right-0 mt-1 w-48 z-20 rounded-box bg-surface-card border border-surface-border shadow-xl p-1 text-sm" onMouseLeave={() => setMenuFor(null)}>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            setEditingId(pet.id);
                            setFormMode("edit");
                          }}
                          className="w-full min-h-10 flex items-center gap-2 px-2.5 rounded-box hover:bg-surface-muted"
                        >
                          <Pencil className="w-4 h-4" /> Sửa hồ sơ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            if (sub) {
                              show(`Bé ${pet.name} đang có gói định kỳ, không thể xóa hồ sơ.`, { tone: "error" });
                              return;
                            }
                            setDeleting(pet);
                          }}
                          className="w-full min-h-10 flex items-center gap-2 px-2.5 rounded-box hover:bg-red-50 text-red-700"
                        >
                          <Trash2 className="w-4 h-4" /> Xóa hồ sơ
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-bark-700 mr-1">Dị ứng:</span>
                    {pet.allergies.length > 0 ? (
                      pet.allergies.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-tag bg-red-50 text-red-700 border border-red-200">{a}</span>
                      ))
                    ) : (
                      <span className="text-grass-700">Không có</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-bark-700 mr-1">Sở thích:</span>
                    {pet.preferences.length > 0 ? (
                      pet.preferences.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-tag bg-pine-50 text-pine-900 border border-pine-200/80">{p}</span>
                      ))
                    ) : (
                      <span className="text-bark-500">Chưa cập nhật</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-bark-600">
                  <span>Đã nhận: <strong className="text-pine-950">{boxesReceived[pet.id] || 0} hộp</strong></span>
                  {sub && (
                    <Link href="/my-account/subscriptions" className="font-semibold text-pine-900 hover:underline">
                      Đang có {sub.planName} (còn {sub.remaining})
                    </Link>
                  )}
                </div>
                <ButtonLink href={`/boxes?species=${pet.species}`} variant="secondary" size="sm" className="w-full">
                  Đặt hộp cho bé {pet.name}
                </ButtonLink>
              </div>
            </div>
          );
        })}
      </div>

      {formMode && (
        <PetFormModal
          key={editingId || "new"}
          mode={formMode}
          pet={formMode === "edit" ? editingPet : null}
          userId={user.id || ""}
          onClose={() => setFormMode(null)}
          onSaved={(msg) => {
            setFormMode(null);
            show(msg);
          }}
          addPet={addPet}
          updatePet={updatePet}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Xóa hồ sơ thú cưng?"
        message={
          <>
            Hồ sơ bé <strong>{deleting?.name}</strong> và các hộp gắn với bé trong giỏ hàng sẽ bị xóa. Lịch sử đơn hàng vẫn được giữ.
          </>
        }
        confirmLabel="Xóa hồ sơ"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function ChipPicker({
  options,
  value,
  onChange,
  tone,
  otherPlaceholder,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  tone: "red" | "pine";
  otherPlaceholder: string;
}) {
  const [other, setOther] = useState("");
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const on = tone === "red" ? "bg-red-50 text-red-700 border-red-400" : "bg-pine-50 text-pine-900 border-pine-700";
  const toggle = (item: string) => onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  const addOther = () => {
    const t = other.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setOther("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {all.map((item) => {
          const selected = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={selected}
              className={`min-h-9 px-3 rounded-tag border text-xs font-semibold transition-colors ${selected ? on : "bg-white text-bark-700 border-surface-border hover:bg-surface-muted"}`}
            >
              {selected ? "✓ " : ""}
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOther();
            }
          }}
          placeholder={otherPlaceholder}
          className="flex-1 min-h-10 px-3 rounded-box border border-surface-border text-sm"
        />
        <Button variant="secondary" size="sm" onClick={addOther} disabled={!other.trim()}>
          Thêm
        </Button>
      </div>
    </div>
  );
}

function PetFormModal({
  mode,
  pet,
  userId,
  onClose,
  onSaved,
  addPet,
  updatePet,
}: {
  mode: "add" | "edit";
  pet: Pet | null;
  userId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  addPet: ReturnType<typeof useApp>["addPet"];
  updatePet: ReturnType<typeof useApp>["updatePet"];
}) {
  const [form, setForm] = useState<PetFormValue>(() =>
    pet
      ? {
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          weight: pet.weight ? String(pet.weight) : "",
          ageGroup: pet.ageGroup,
          gender: pet.gender,
          birthdate: pet.birthdate || "",
          allergies: pet.allergies,
          preferences: pet.preferences,
          notes: pet.notes || "",
        }
      : emptyForm()
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof PetFormValue>(key: K, value: PetFormValue[K]) => setForm((f) => ({ ...f, [key]: value }));

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Ảnh phải là JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Ảnh tối đa 5MB.");
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(form.weight.replace(",", "."));
    if (!form.name.trim()) return setError("Vui lòng nhập tên bé.");
    if (!weight || weight <= 0 || weight > 120) return setError("Vui lòng nhập cân nặng hợp lệ (kg).");
    setSaving(true);
    setError("");
    try {
      const data = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim(),
        weight,
        size: (weight >= 10 ? "large" : "small") as Pet["size"],
        ageGroup: form.ageGroup,
        ageLabel: AGE_LABEL[form.ageGroup],
        gender: form.gender,
        birthdate: form.birthdate || undefined,
        allergies: form.allergies,
        preferences: form.preferences,
        notes: form.notes?.trim() || undefined,
      };
      const saved = mode === "edit" && pet ? (await updatePet(pet.id, data), pet) : await addPet(data);

      if (avatarFile && userId) {
        const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${saved.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await createClient().storage.from("pet-avatars").upload(path, avatarFile, { contentType: avatarFile.type });
        if (!upErr) await updatePet(saved.id, { avatarPath: path });
      }
      onSaved(mode === "edit" ? `Đã lưu hồ sơ bé ${data.name}` : `Đã thêm bé ${data.name}`);
    } catch {
      setError("Không lưu được hồ sơ, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full min-h-11 px-3 rounded-box border border-surface-border bg-white text-sm focus:outline-none focus:border-pine-800";
  const label = "text-xs font-bold text-bark-800 block mb-1";

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "edit" ? `Sửa hồ sơ bé ${pet?.name || ""}` : "Thêm bé mới"}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" form="pet-form" loading={saving}>{mode === "edit" ? "Lưu thay đổi" : "Thêm bé"}</Button>
        </>
      }
    >
      <form id="pet-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-box overflow-hidden border border-dashed border-pine-800/40 bg-surface-muted flex items-center justify-center shrink-0"
            aria-label="Chọn ảnh đại diện cho bé"
          >
            {avatarPreview ? <Image src={avatarPreview} alt="Ảnh bé" fill sizes="64px" className="object-cover" unoptimized /> : <Camera className="w-6 h-6 text-bark-500" />}
          </button>
          <div className="text-xs text-bark-600">
            <span className="font-bold text-bark-800 block">Ảnh đại diện</span>
            JPG, PNG hoặc WEBP, tối đa 5MB.
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickAvatar(e.target.files?.[0])} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Loài *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["dog", "cat"] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  disabled={mode === "edit"}
                  onClick={() => set("species", sp)}
                  aria-pressed={form.species === sp}
                  className={`min-h-11 rounded-box border text-sm font-bold ${form.species === sp ? "bg-pine-50 border-pine-800 text-pine-950" : "bg-white border-surface-border text-bark-700"} disabled:opacity-60`}
                >
                  {form.species === sp ? "✓ " : ""}{sp === "dog" ? "Chó" : "Mèo"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label} htmlFor="pet-name">Tên bé *</label>
            <input id="pet-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ví dụ: Bơ" required />
          </div>
          <div>
            <label className={label} htmlFor="pet-breed">Giống</label>
            <input id="pet-breed" className={input} list={`breeds-${form.species}`} value={form.breed} onChange={(e) => set("breed", e.target.value)} placeholder={form.species === "dog" ? "Poodle, Corgi..." : "Anh lông ngắn, Ba Tư..."} />
            <datalist id={`breeds-${form.species}`}>
              {BREED_SUGGESTIONS[form.species].map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>
          <div>
            <label className={label} htmlFor="pet-weight">Cân nặng (kg) *</label>
            <input id="pet-weight" className={input} inputMode="decimal" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="Ví dụ: 6.5" required />
          </div>
          <div>
            <label className={label} htmlFor="pet-age">Độ tuổi *</label>
            <select id="pet-age" className={input} value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value as Pet["ageGroup"])}>
              {Object.entries(AGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Giới tính</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["Đực", "Cái"] as const).map((g) => (
                <button key={g} type="button" onClick={() => set("gender", g)} aria-pressed={form.gender === g}
                  className={`min-h-11 rounded-box border text-sm font-bold ${form.gender === g ? "bg-pine-50 border-pine-800 text-pine-950" : "bg-white border-surface-border text-bark-700"}`}>
                  {g === "Đực" ? "♂ Đực" : "♀ Cái"}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="pet-birthdate">Ngày sinh</label>
            <input id="pet-birthdate" type="date" className={input} value={form.birthdate || ""} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("birthdate", e.target.value)} />
            <p className="text-[11px] text-bark-500 mt-1">Dùng để gửi quà sinh nhật cho bé khi đăng ký gói 6 hộp.</p>
          </div>
        </div>

        <div>
          <label className={label}>Dị ứng cần tránh</label>
          <ChipPicker tone="red" options={ALLERGY_OPTIONS} value={form.allergies} onChange={(v) => set("allergies", v)} otherPlaceholder="Dị ứng khác, ví dụ: Thịt vịt" />
        </div>
        <div>
          <label className={label}>Sở thích</label>
          <ChipPicker tone="pine" options={PREFERENCE_OPTIONS[form.species]} value={form.preferences} onChange={(v) => set("preferences", v)} otherPlaceholder="Sở thích khác" />
        </div>

        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      </form>
    </Modal>
  );
}
