"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { calcShippingFee } from "@/lib/shipping";
import { petRowToPet, productRowToProduct, boxTypeRowToBoxType, ProductWithCategory } from "@/lib/adapters";
import { Pet, Product, BoxType } from "@/types/models";
import type { UserRole } from "@/lib/roles";

const GUEST_CART_KEY = "fpets_guest_cart";

export interface CartItem {
  id: string; // unique cart line id (id thật trong Supabase khi đã đăng nhập, id tạm khi là khách)
  type: 'box' | 'retail';
  productId?: string;
  product?: Product;
  boxTypeId?: string;
  boxType?: BoxType;
  petId?: string;
  petName?: string;
  quantity: number;
  unitPrice: number;
}

interface GuestCartLine {
  productId: string;
  quantity: number;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AppContextType {
  // Auth
  isLoggedIn: boolean;
  isLoadingAuth: boolean;
  user: UserProfile;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Pets (Supabase thật, chỉ có khi đã đăng nhập)
  pets: Pet[];
  addPet: (pet: Omit<Pet, "id" | "avatarColor" | "avatarPath">) => Promise<Pet>;
  updatePet: (id: string, updated: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;

  // Cart (Supabase khi đăng nhập, localStorage khi là khách vãng lai)
  cart: CartItem[];
  // false cho tới khi giỏ hàng được tải xong lần đầu: tránh hiện "giỏ trống" khi dữ liệu chưa về
  isCartReady: boolean;
  // Trả về mã dòng giỏ hàng vừa thêm (hoặc dòng đã có sẵn) để trang gọi có thể tick chọn nó
  addToCart: (item: Omit<CartItem, "id">) => Promise<string | undefined>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  // Báo lỗi (throw) nếu server không nhận, giỏ trên màn hình được trả về như cũ
  updatePetForBox: (cartItemId: string, petId: string, petName: string) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  // Các món khách tick để thanh toán (như giỏ Shopee): mọi số tiền bên dưới chỉ tính trên các món này
  selectedIds: string[];
  selectedCart: CartItem[];
  toggleSelected: (id: string) => void;
  selectOnly: (ids: string[]) => void;
  // Xóa nhiều dòng một lần (nút "Xóa các món đã chọn" trong giỏ)
  removeManyFromCart: (ids: string[]) => Promise<void>;
  // Đặt hàng xong: chỉ gỡ các món đã đặt, món chưa tick vẫn nằm lại trong giỏ
  removeOrderedFromCart: (ids: string[]) => Promise<void>;
  // Mã đang áp dụng được cho các món đã tick ("" nếu chưa có mã hoặc mã chưa đủ điều kiện)
  voucherCode: string;
  voucherDiscount: number;
  voucherFreeShip: boolean;
  voucherApplied: boolean;
  voucherMessage: string;
  applyVoucher: (code: string) => Promise<boolean>;
  clearVoucher: () => void;
  subtotal: number;
  // null = chưa biết tỉnh nhận hàng (giỏ hàng), checkout tính theo địa chỉ thật
  shippingFee: number | null;
  total: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function readGuestCart(): GuestCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const VOUCHER_KEY = "fpets_voucher_code";
const SELECTED_KEY = "fpets_cart_selected";

function storeSelectedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
  } catch {
    // sessionStorage bị chặn: lựa chọn chỉ sống trong trang hiện tại
  }
}

function readSelectedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SELECTED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Thông tin mã giảm giá khách đã nhập; số tiền giảm được tính lại mỗi khi khách đổi các món đã tick
interface AppliedVoucher {
  code: string;
  voucherType: string;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  scope: string;
}

const VOUCHER_SCOPE_LABEL: Record<string, string> = {
  retail: "sản phẩm bán lẻ",
  box: "Mystery Box",
  first_subscription: "đăng ký gói định kỳ lần đầu",
};

function storeVoucherCode(code: string) {
  if (typeof window === "undefined") return;
  try {
    if (code) window.sessionStorage.setItem(VOUCHER_KEY, code);
    else window.sessionStorage.removeItem(VOUCHER_KEY);
  } catch {
    // sessionStorage bị chặn: voucher chỉ sống trong trang hiện tại
  }
}

function readVoucherCode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(VOUCHER_KEY) || "";
  } catch {
    return "";
  }
}

function writeGuestCart(lines: GuestCartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
  } catch {
    // localStorage có thể bị chặn (private mode) - bỏ qua, giỏ chỉ sống trong session
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const DEFAULT_USER: UserProfile = {
    name: "Khách hàng",
    email: "",
    phone: "",
    address: "",
    role: "customer"
  };

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const cartIdRef = useRef<string | null>(null);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const supabase = createClient();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profile && !error && profile.is_active === false) {
        // Tài khoản bị khóa: thoát phiên, coi như khách chưa đăng nhập
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        setUser(DEFAULT_USER);
        return;
      }
      if (profile && !error) {
        setUser({
          id: profile.id,
          name: profile.full_name || email?.split("@")[0] || "Thành viên",
          email: profile.email || email || "",
          phone: profile.phone || "",
          address: "",
          role: profile.role || "customer",
          avatarUrl: profile.avatar_url || undefined,
        });
        setIsLoggedIn(true);
      } else {
        setUser({
          id: userId,
          name: email?.split("@")[0] || "Thành viên",
          email: email || "",
          phone: "",
          address: "",
          role: "customer",
        });
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error("Lỗi tải thông tin người dùng:", err);
      setIsLoggedIn(true);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoadingAuth(false);
      return;
    }

    try {
      const supabase = createClient();

      // Chờ tải xong hồ sơ rồi mới báo hết "đang tải": nếu không, có một nhịp isLoadingAuth = false
      // mà isLoggedIn vẫn false và các trang bắt buộc đăng nhập (thanh toán) đẩy nhầm người dùng ra /login
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          setIsLoggedIn(false);
          setUser(DEFAULT_USER);
        }
        setIsLoadingAuth(false);
      }).catch((err) => {
        console.warn("Lỗi getSession Supabase:", err);
        setIsLoadingAuth(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email);
          } else {
            setIsLoggedIn(false);
            setUser(DEFAULT_USER);
          }
          setIsLoadingAuth(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.warn("Lỗi khởi tạo Supabase auth listener:", err);
      setIsLoadingAuth(false);
    }
  }, []);


  // Đăng nhập / đăng xuất diễn ra mà không tải lại trang. Next.js đã tải trước (prefetch) các link
  // tới /my-account lúc khách CHƯA đăng nhập và lưu sẵn kết quả "chuyển về /login" của middleware;
  // không xóa bộ nhớ đệm thì đăng nhập xong bấm "Đơn hàng" vẫn bị đưa về trang đăng nhập.
  const router = useRouter();
  const settledAuth = useRef<boolean | null>(null);
  useEffect(() => {
    if (isLoadingAuth) return;
    if (settledAuth.current !== null && settledAuth.current !== isLoggedIn) router.refresh();
    settledAuth.current = isLoggedIn;
  }, [isLoadingAuth, isLoggedIn, router]);

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    } finally {
      setIsLoggedIn(false);
      setUser(DEFAULT_USER);
      setPets([]);
      setCart([]);
      cartIdRef.current = null;
    }
  };

  const refreshUser = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id, session.user.email);
    }
  };

  // ---------------------------------------------------------------------------
  // PETS: dữ liệu thật từ Supabase, chỉ tồn tại khi đã đăng nhập.
  // Luôn lọc theo user_id: tài khoản admin được RLS cho đọc mọi hồ sơ, nếu chỉ dựa vào RLS
  // thì admin xem cửa hàng sẽ thấy thú cưng của tất cả khách như của mình.
  // ---------------------------------------------------------------------------
  const [pets, setPets] = useState<Pet[]>([]);
  const loadPets = async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("pets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (!error && data) {
      setPets(data.map(petRowToPet));
    }
  };

  const addPet = async (newPetData: Omit<Pet, "id" | "avatarColor" | "avatarPath">): Promise<Pet> => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error("Cần đăng nhập để tạo hồ sơ thú cưng");

    const { data, error } = await supabase
      .from("pets")
      .insert({
        user_id: authUser.id,
        name: newPetData.name,
        species: newPetData.species,
        breed: newPetData.breed || null,
        weight: newPetData.weight || null,
        size: newPetData.size,
        age_group: newPetData.ageGroup,
        gender: newPetData.gender,
        birthdate: newPetData.birthdate || null,
        allergies: newPetData.allergies,
        preferences: newPetData.preferences,
        notes: newPetData.notes || null,
      })
      .select("*")
      .single();

    if (error || !data) throw error || new Error("Không thể tạo hồ sơ thú cưng");
    const pet = petRowToPet(data);
    setPets(prev => [pet, ...prev]);
    return pet;
  };

  const updatePet = async (id: string, updated: Partial<Pet>) => {
    const supabase = createClient();
    const patch: import("@/types/database").TablesUpdate<"pets"> = {
      ...(updated.name !== undefined && { name: updated.name }),
      ...(updated.species !== undefined && { species: updated.species }),
      ...(updated.breed !== undefined && { breed: updated.breed }),
      ...(updated.weight !== undefined && { weight: updated.weight }),
      ...(updated.size !== undefined && { size: updated.size }),
      ...(updated.ageGroup !== undefined && { age_group: updated.ageGroup }),
      ...(updated.gender !== undefined && { gender: updated.gender }),
      ...(updated.birthdate !== undefined && { birthdate: updated.birthdate }),
      ...(updated.allergies !== undefined && { allergies: updated.allergies }),
      ...(updated.preferences !== undefined && { preferences: updated.preferences }),
      ...(updated.notes !== undefined && { notes: updated.notes }),
      ...(updated.avatarPath !== undefined && { avatar_url: updated.avatarPath }),
    };

    const { error } = await supabase.from("pets").update(patch).eq("id", id);
    if (error) throw error;
    setPets(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const deletePet = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) throw error;
    setPets(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(c => c.petId !== id));
  };

  // ---------------------------------------------------------------------------
  // CART: khách vãng lai -> localStorage (chỉ hàng lẻ); đã đăng nhập -> Supabase
  // carts/cart_items thật (đúng SPEC §4: "giỏ lưu theo tài khoản ... đăng nhập
  // thì gộp giỏ").
  // ---------------------------------------------------------------------------
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [isCartReady, setIsCartReady] = useState(false);

  // Mỗi tài khoản 1 giỏ (unique index carts_user_id_unique). Hai tab cùng tạo giỏ thì tab chậm hơn
  // gặp lỗi trùng khóa (23505) và đọc lại giỏ vừa được tạo.
  const getOrCreateCartId = async (userId: string): Promise<string> => {
    const supabase = createClient();
    const findCart = () => supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
    const { data: existing } = await findCart();
    if (existing) return existing.id;
    const { data: created, error } = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
    if (created) return created.id;
    if (error?.code === "23505") {
      const { data: again } = await findCart();
      if (again) return again.id;
    }
    throw error || new Error("Không thể tạo giỏ hàng");
  };

  type CartItemRow = {
    id: string;
    quantity: number;
    product_id: string | null;
    box_type_id: string | null;
    pet_id: string | null;
    products: ProductWithCategory | null;
    box_types: import("@/types/database").Tables<"box_types"> | null;
    pets: { name: string } | null;
  };

  const mapDbCartRow = (row: CartItemRow): CartItem => {
    if (row.product_id && row.products) {
      const product = productRowToProduct(row.products);
      return {
        id: row.id,
        type: "retail",
        productId: row.product_id,
        product,
        quantity: row.quantity,
        unitPrice: product.price,
      };
    }
    const boxType = row.box_types ? boxTypeRowToBoxType(row.box_types) : undefined;
    return {
      id: row.id,
      type: "box",
      boxTypeId: row.box_type_id || undefined,
      boxType,
      petId: row.pet_id || undefined,
      petName: row.pets?.name,
      quantity: row.quantity,
      unitPrice: boxType?.basePrice || 0,
    };
  };

  const loadServerCart = async (userId: string) => {
    const supabase = createClient();
    const cartId = await getOrCreateCartId(userId);
    cartIdRef.current = cartId;
    const { data, error } = await supabase
      .from("cart_items")
      .select("id, quantity, product_id, box_type_id, pet_id, products(*, categories(name, slug)), box_types(*), pets(name)")
      .eq("cart_id", cartId);

    if (!error && data) {
      setCart((data as unknown as CartItemRow[]).map(mapDbCartRow));
    }
  };

  const mergeGuestCartIntoServer = async (userId: string) => {
    const guestLines = readGuestCart();
    if (guestLines.length === 0) return;
    const supabase = createClient();
    const cartId = cartIdRef.current || (await getOrCreateCartId(userId));
    for (const line of guestLines) {
      const { data: existingRow } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", line.productId)
        .maybeSingle();
      if (existingRow) {
        await supabase.from("cart_items").update({ quantity: Math.min(10, existingRow.quantity + line.quantity) }).eq("id", existingRow.id);
      } else {
        await supabase.from("cart_items").insert({ cart_id: cartId, product_id: line.productId, quantity: line.quantity });
      }
    }
    writeGuestCart([]);
  };

  const loadGuestCart = async () => {
    const guestLines = readGuestCart();
    if (guestLines.length === 0) {
      setCart([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*, categories(name, slug)")
      .in("id", guestLines.map((l) => l.productId));

    const products = (data as unknown as ProductWithCategory[] | null) || [];
    const items: CartItem[] = guestLines
      .map((line): CartItem | null => {
        const row = products.find((p) => p.id === line.productId);
        if (!row) return null;
        const product = productRowToProduct(row);
        return {
          id: "guest-" + line.productId,
          type: "retail",
          productId: line.productId,
          product,
          quantity: Math.min(line.quantity, product.stock || line.quantity),
          unitPrice: product.price,
        };
      })
      .filter((x): x is CartItem => x !== null);
    setCart(items);
  };

  // Đồng bộ giỏ hàng theo trạng thái đăng nhập (và gộp giỏ khách vãng lai khi vừa login)
  const prevLoggedIn = useRef(false);
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isSupabaseConfigured()) {
      setIsCartReady(true);
      return;
    }
    (async () => {
      setCartLoading(true);
      try {
        if (isLoggedIn && user.id) {
          await loadPets(user.id);
          if (!prevLoggedIn.current) {
            await mergeGuestCartIntoServer(user.id);
          }
          await loadServerCart(user.id);
        } else {
          cartIdRef.current = null;
          await loadGuestCart();
        }
      } finally {
        setCartLoading(false);
        setIsCartReady(true);
        prevLoggedIn.current = isLoggedIn;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isLoadingAuth, user.id]);

  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherError, setVoucherError] = useState<string>("");

  // Món được tick trong giỏ. Mặc định chưa tick món nào; lựa chọn giữ trong phiên để tải lại trang không mất.
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  useEffect(() => setSelectedIdsState(readSelectedIds()), []);
  const setSelectedIds = (ids: string[]) => {
    setSelectedIdsState(ids);
    storeSelectedIds(ids);
  };
  const toggleSelected = (id: string) => setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const selectOnly = (ids: string[]) => setSelectedIds(ids);
  const selectedCart = useMemo(() => cart.filter((c) => selectedIds.includes(c.id)), [cart, selectedIds]);

  const addToCart = async (item: Omit<CartItem, "id">): Promise<string | undefined> => {
    if (!isLoggedIn || !user.id) {
      // Yêu cầu đăng nhập để mua sắm và thêm sản phẩm vào giỏ
      return undefined;
    }
    let lineId: string | undefined;

    const supabase = createClient();
    const cartId = cartIdRef.current || (await getOrCreateCartId(user.id));
    cartIdRef.current = cartId;

    if (item.type === "retail" && item.productId) {
      const maxQty = Math.min(10, item.product?.stock ?? 10);
      // Hết hàng: không thêm (giỏ không nhận dòng số lượng 0)
      if (maxQty < 1) return undefined;
      const { data: existingRow } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", item.productId)
        .maybeSingle();
      if (existingRow) {
        await supabase.from("cart_items").update({ quantity: Math.min(maxQty, existingRow.quantity + item.quantity) }).eq("id", existingRow.id);
        lineId = existingRow.id;
      } else {
        const { data: inserted } = await supabase
          .from("cart_items")
          .insert({ cart_id: cartId, product_id: item.productId, quantity: Math.min(maxQty, item.quantity) })
          .select("id")
          .single();
        lineId = inserted?.id;
      }
    } else if (item.type === "box" && item.boxTypeId && item.petId) {
      // Một đơn chứa được nhiều Mystery Box (mỗi bé một hộp, hoặc nhiều loại hộp), nhưng cùng một
      // loại hộp cho cùng một bé thì chỉ 1 dòng: mỗi hộp được tuyển chọn riêng (khớp ràng buộc ở server).
      const { data: sameBox } = await supabase
        .from("cart_items")
        .select("id")
        .eq("cart_id", cartId)
        .eq("box_type_id", item.boxTypeId)
        .eq("pet_id", item.petId)
        .maybeSingle();
      if (sameBox) {
        lineId = sameBox.id;
      } else {
        const { data: inserted } = await supabase
          .from("cart_items")
          .insert({ cart_id: cartId, box_type_id: item.boxTypeId, pet_id: item.petId, quantity: 1 })
          .select("id")
          .single();
        lineId = inserted?.id;
      }
    }
    await loadServerCart(user.id);
    return lineId;
  };

  const updateQuantity = async (id: string, delta: number) => {
    const current = cart.find((c) => c.id === id);
    if (!current) return;
    // Mỗi dòng Mystery Box là 1 hộp cho 1 bé (mỗi hộp được tuyển chọn riêng), nên số lượng cố định là 1.
    const maxQty = current.type === "box" ? 1 : Math.min(10, current.product?.stock ?? 10);
    const newQ = Math.max(1, Math.min(maxQty, current.quantity + delta));

    if (isLoggedIn && user.id) {
      // Cập nhật giao diện ngay, không chờ server (tránh cảm giác bấm không ăn)
      setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: newQ } : c)));
      await createClient().from("cart_items").update({ quantity: newQ }).eq("id", id);
    } else {
      const lines = readGuestCart();
      const line = lines.find((l) => l.productId === current.productId);
      if (line) line.quantity = newQ;
      writeGuestCart(lines);
      setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: newQ } : c)));
    }
  };

  const updatePetForBox = async (cartItemId: string, petId: string, petName: string) => {
    const before = cart.find((c) => c.id === cartItemId);
    setCart((prev) => prev.map((c) => (c.id === cartItemId ? { ...c, petId, petName } : c)));
    if (!isLoggedIn) return;
    const { error } = await createClient().from("cart_items").update({ pet_id: petId }).eq("id", cartItemId);
    if (error) {
      // Server không nhận (ví dụ bé đã có cùng loại hộp trong giỏ): trả giỏ về như cũ
      if (before) setCart((prev) => prev.map((c) => (c.id === cartItemId ? before : c)));
      throw error;
    }
  };

  const removeFromCart = async (id: string) => {
    const current = cart.find((c) => c.id === id);
    setCart((prev) => prev.filter((c) => c.id !== id));
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((x) => x !== id));
    if (isLoggedIn && user.id) {
      await createClient().from("cart_items").delete().eq("id", id);
    } else if (current?.productId) {
      writeGuestCart(readGuestCart().filter((l) => l.productId !== current.productId));
    }
  };

  const clearVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError("");
    storeVoucherCode("");
  };

  const removeManyFromCart = async (ids: string[]) => {
    setCart((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds(selectedIds.filter((x) => !ids.includes(x)));
    if (isLoggedIn && ids.length > 0) {
      await createClient().from("cart_items").delete().in("id", ids);
    }
  };

  const removeOrderedFromCart = async (ids: string[]) => {
    await removeManyFromCart(ids);
    clearVoucher();
  };

  // Xem trước giảm giá: server chỉ trả đúng mã khách nhập nếu còn hiệu lực (bảng voucher không mở công khai).
  // Số tiền giảm cuối cùng luôn được checkout_create_order tính lại ở server, không tin giá trị này.
  const applyVoucher = async (code: string): Promise<boolean> => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return false;
    }

    const supabase = createClient();
    const { data: rows } = await supabase.rpc("preview_voucher", { p_code: clean });
    const voucher = rows?.[0];

    if (!voucher) {
      setAppliedVoucher(null);
      storeVoucherCode("");
      setVoucherError("Mã không hợp lệ hoặc đã hết hạn");
      return false;
    }

    setVoucherError("");
    setAppliedVoucher({
      code: clean,
      voucherType: voucher.voucher_type,
      discountValue: voucher.discount_value,
      maxDiscount: voucher.max_discount,
      minOrderValue: voucher.min_order_value,
      scope: voucher.scope,
    });
    storeVoucherCode(clean);
    return true;
  };

  // Mức giảm theo các món đang tick (khớp cách tính của checkout_create_order): đổi lựa chọn là tính lại ngay
  const voucherState = useMemo(() => {
    const none = { discount: 0, freeShip: false, applied: false };
    if (!appliedVoucher) return { ...none, message: voucherError };
    const v = appliedVoucher;
    if (selectedCart.length === 0) return { ...none, message: `Đã nhận mã ${v.code}. Tick món cần thanh toán để áp dụng.` };
    const amountOf = (type?: CartItem["type"]) =>
      selectedCart.filter((c) => !type || c.type === type).reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
    // Phạm vi voucher: giảm trên phần hàng thuộc phạm vi
    const base = v.scope === "all" ? amountOf() : v.scope === "retail" ? amountOf("retail") : v.scope === "box" ? amountOf("box") : 0;
    if (base <= 0) return { ...none, message: `Mã này chỉ áp dụng cho ${VOUCHER_SCOPE_LABEL[v.scope] || "đơn phù hợp"}` };
    if (base < v.minOrderValue) return { ...none, message: `Đơn tối thiểu ${v.minOrderValue.toLocaleString("vi-VN")}₫ mới áp dụng được mã này` };
    let discount = 0;
    if (v.voucherType === "percentage") {
      discount = Math.round((base * v.discountValue) / 100);
      if (v.maxDiscount) discount = Math.min(discount, v.maxDiscount);
    } else if (v.voucherType === "fixed_amount") {
      discount = Math.min(v.discountValue, base);
    }
    // Voucher freeship không trừ tiền hàng: nó đưa phí ship về 0
    return { discount, freeShip: v.voucherType === "free_shipping", applied: true, message: "Áp dụng thành công" };
  }, [appliedVoucher, voucherError, selectedCart]);

  // Khôi phục voucher đã áp khi khách tải lại trang (giỏ tải xong mới tính lại được số tiền giảm)
  const voucherRestored = useRef(false);
  useEffect(() => {
    if (voucherRestored.current || cartLoading || cart.length === 0 || appliedVoucher) return;
    voucherRestored.current = true;
    const stored = readVoucherCode();
    if (stored) applyVoucher(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, cartLoading, appliedVoucher]);

  // Mọi số tiền chỉ tính trên các món đã tick; chưa tick món nào thì bằng 0
  const subtotal = selectedCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingFee = calcShippingFee(null, subtotal, voucherState.freeShip);
  const total = Math.max(0, subtotal + (shippingFee ?? 0) - voucherState.discount);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isLoadingAuth,
        user,
        logout,
        refreshUser,
        pets,
        addPet,
        updatePet,
        deletePet,
        cart,
        isCartReady,
        addToCart,
        updateQuantity,
        updatePetForBox,
        removeFromCart,
        selectedIds,
        selectedCart,
        toggleSelected,
        selectOnly,
        removeManyFromCart,
        removeOrderedFromCart,
        voucherCode: voucherState.applied && appliedVoucher ? appliedVoucher.code : "",
        voucherDiscount: voucherState.discount,
        voucherFreeShip: voucherState.freeShip,
        voucherApplied: voucherState.applied,
        voucherMessage: voucherState.message,
        applyVoucher,
        clearVoucher,
        subtotal,
        shippingFee,
        total,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
