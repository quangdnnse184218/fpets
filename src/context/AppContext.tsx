"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Pet } from "@/mock/pets";
import { Product } from "@/mock/products";
import { BoxType } from "@/mock/boxTypes";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { calcShippingFee } from "@/lib/shipping";
import { petRowToPet, productRowToProduct, boxTypeRowToBoxType, ProductWithCategory } from "@/lib/adapters";

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
  role: 'customer' | 'admin';
  avatarUrl?: string;
}

interface AppContextType {
  // Auth
  isLoggedIn: boolean;
  isLoadingAuth: boolean;
  user: UserProfile;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Pets (Supabase thật, chỉ có khi đã đăng nhập)
  pets: Pet[];
  petsLoading: boolean;
  addPet: (pet: Omit<Pet, "id" | "receivedBoxesCount" | "avatarColor">) => Promise<Pet>;
  updatePet: (id: string, updated: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;

  // Cart (Supabase khi đăng nhập, localStorage khi là khách vãng lai)
  cart: CartItem[];
  cartLoading: boolean;
  addToCart: (item: Omit<CartItem, "id">) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  updatePetForBox: (cartItemId: string, petId: string, petName: string) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  voucherCode: string;
  voucherDiscount: number;
  voucherFreeShip: boolean;
  voucherMessage: string;
  applyVoucher: (code: string) => Promise<boolean>;
  subtotal: number;
  shippingFee: number;
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

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email);
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
        async (event, session) => {
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

  const login = () => setIsLoggedIn(true);

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
  // PETS: dữ liệu thật từ Supabase, chỉ tồn tại khi đã đăng nhập (RLS pets_own_all).
  // ---------------------------------------------------------------------------
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);

  const loadPets = async () => {
    setPetsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        setPets(data.map(petRowToPet));
      }
    } finally {
      setPetsLoading(false);
    }
  };

  const addPet = async (newPetData: Omit<Pet, "id" | "receivedBoxesCount" | "avatarColor">): Promise<Pet> => {
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

  const getOrCreateCartId = async (userId: string): Promise<string> => {
    const supabase = createClient();
    const { data: existing } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
    if (existing) return existing.id;
    const { data: created, error } = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
    if (error || !created) throw error || new Error("Không thể tạo giỏ hàng");
    return created.id;
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
    if (isLoadingAuth || !isSupabaseConfigured()) return;
    (async () => {
      setCartLoading(true);
      try {
        if (isLoggedIn && user.id) {
          await loadPets();
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
        prevLoggedIn.current = isLoggedIn;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isLoadingAuth, user.id]);

  const [voucherCode, setVoucherCode] = useState<string>("");
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherFreeShip, setVoucherFreeShip] = useState<boolean>(false);
  const [voucherMessage, setVoucherMessage] = useState<string>("");

  const addToCart = async (item: Omit<CartItem, "id">) => {
    if (isLoggedIn && user.id) {
      const supabase = createClient();
      const cartId = cartIdRef.current || (await getOrCreateCartId(user.id));
      cartIdRef.current = cartId;

      if (item.type === "retail" && item.productId) {
        const maxQty = Math.min(10, item.product?.stock ?? 10);
        const { data: existingRow } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cartId)
          .eq("product_id", item.productId)
          .maybeSingle();
        if (existingRow) {
          await supabase.from("cart_items").update({ quantity: Math.min(maxQty, existingRow.quantity + item.quantity) }).eq("id", existingRow.id);
        } else {
          await supabase.from("cart_items").insert({ cart_id: cartId, product_id: item.productId, quantity: Math.min(maxQty, item.quantity) });
        }
      } else if (item.type === "box" && item.boxTypeId) {
        // Mỗi đơn chỉ được chứa 1 Mystery Box (bảng box_curations ràng buộc
        // UNIQUE theo order_id, và luồng đánh giá/feedback sau này cũng chỉ xử lý
        // 1 box/đơn). Nếu khách đã có box khác trong giỏ, thay bằng box mới này
        // thay vì cộng dồn thành nhiều dòng box - tránh vỡ khi tạo đơn.
        const { data: otherBoxRows } = await supabase
          .from("cart_items")
          .select("id")
          .eq("cart_id", cartId)
          .not("box_type_id", "is", null);
        if (otherBoxRows && otherBoxRows.length > 0) {
          await supabase.from("cart_items").delete().in("id", otherBoxRows.map((r) => r.id));
        }
        await supabase.from("cart_items").insert({ cart_id: cartId, box_type_id: item.boxTypeId, pet_id: item.petId || null, quantity: 1 });
      }
      await loadServerCart(user.id);
    } else {
      if (item.type !== "retail" || !item.productId) return; // box bắt buộc đăng nhập, đã gate ở UI
      const lines = readGuestCart();
      const existingIdx = lines.findIndex((l) => l.productId === item.productId);
      const maxQty = Math.min(10, item.product?.stock ?? 10);
      if (existingIdx >= 0) {
        lines[existingIdx].quantity = Math.min(maxQty, lines[existingIdx].quantity + item.quantity);
      } else {
        lines.push({ productId: item.productId, quantity: Math.min(maxQty, item.quantity) });
      }
      writeGuestCart(lines);
      await loadGuestCart();
    }
  };

  const updateQuantity = async (id: string, delta: number) => {
    const current = cart.find((c) => c.id === id);
    if (!current) return;
    // Mystery Box luôn cố định số lượng 1 (mỗi đơn chỉ chứa 1 box, xem addToCart).
    const maxQty = current.type === "box" ? 1 : Math.min(10, current.product?.stock ?? 10);
    const newQ = Math.max(1, Math.min(maxQty, current.quantity + delta));

    if (isLoggedIn && user.id) {
      const supabase = createClient();
      await supabase.from("cart_items").update({ quantity: newQ }).eq("id", id);
      setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: newQ } : c)));
    } else {
      const lines = readGuestCart();
      const line = lines.find((l) => l.productId === current.productId);
      if (line) line.quantity = newQ;
      writeGuestCart(lines);
      setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: newQ } : c)));
    }
  };

  const updatePetForBox = async (cartItemId: string, petId: string, petName: string) => {
    if (isLoggedIn) {
      const supabase = createClient();
      await supabase.from("cart_items").update({ pet_id: petId }).eq("id", cartItemId);
    }
    setCart((prev) => prev.map((c) => (c.id === cartItemId ? { ...c, petId, petName } : c)));
  };

  const removeFromCart = async (id: string) => {
    if (isLoggedIn && user.id) {
      const supabase = createClient();
      await supabase.from("cart_items").delete().eq("id", id);
    } else {
      const current = cart.find((c) => c.id === id);
      if (current?.productId) {
        writeGuestCart(readGuestCart().filter((l) => l.productId !== current.productId));
      }
    }
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const clearCart = async () => {
    if (isLoggedIn && cartIdRef.current) {
      const supabase = createClient();
      await supabase.from("cart_items").delete().eq("cart_id", cartIdRef.current);
    } else {
      writeGuestCart([]);
    }
    setCart([]);
    setVoucherCode("");
    storeVoucherCode("");
    setVoucherDiscount(0);
    setVoucherFreeShip(false);
    setVoucherMessage("");
  };

  // Xem trước giảm giá bằng dữ liệu voucher THẬT trong Supabase (public select cho voucher active).
  // Số tiền giảm cuối cùng luôn được checkout_create_order tính lại ở server, không tin giá trị này.
  const applyVoucher = async (code: string): Promise<boolean> => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setVoucherMessage("Vui lòng nhập mã giảm giá");
      return false;
    }

    const supabase = createClient();
    const { data: voucher } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code", clean)
      .eq("is_active", true)
      .maybeSingle();

    const now = Date.now();
    const expired = voucher && (new Date(voucher.valid_from).getTime() > now || new Date(voucher.valid_to).getTime() < now);
    if (!voucher || expired || (voucher && voucher.used_count >= voucher.usage_limit_total)) {
      setVoucherMessage("Mã voucher không hợp lệ hoặc đã hết hạn");
      setVoucherCode("");
      storeVoucherCode("");
      setVoucherDiscount(0);
      setVoucherFreeShip(false);
      return false;
    }

    // Phạm vi voucher: giảm trên phần hàng thuộc phạm vi (khớp checkout_create_order)
    const retailAmount = cart.filter((c) => c.type === "retail").reduce((s, c) => s + c.unitPrice * c.quantity, 0);
    const boxAmount = cart.filter((c) => c.type === "box").reduce((s, c) => s + c.unitPrice * c.quantity, 0);
    const base =
      voucher.scope === "all" ? subtotal : voucher.scope === "retail" ? retailAmount : voucher.scope === "box" ? boxAmount : 0;
    if (base <= 0) {
      const scopeLabel: Record<string, string> = {
        retail: "sản phẩm bán lẻ",
        box: "Mystery Box",
        first_subscription: "đăng ký gói định kỳ lần đầu",
      };
      setVoucherMessage(`Mã này chỉ áp dụng cho ${scopeLabel[voucher.scope] || "đơn phù hợp"}`);
      setVoucherCode("");
      storeVoucherCode("");
      setVoucherDiscount(0);
      setVoucherFreeShip(false);
      return false;
    }

    if (base < voucher.min_order_value) {
      setVoucherMessage(`Đơn tối thiểu ${voucher.min_order_value.toLocaleString("vi-VN")}₫ mới áp dụng được mã này`);
      setVoucherCode("");
      storeVoucherCode("");
      setVoucherDiscount(0);
      setVoucherFreeShip(false);
      return false;
    }

    let discount = 0;
    if (voucher.voucher_type === "percentage") {
      discount = Math.round((base * voucher.discount_value) / 100);
      if (voucher.max_discount) discount = Math.min(discount, voucher.max_discount);
    } else if (voucher.voucher_type === "fixed_amount") {
      discount = Math.min(voucher.discount_value, base);
    } else if (voucher.voucher_type === "free_shipping") {
      discount = shippingFee;
    }

    setVoucherCode(clean);
    storeVoucherCode(clean);
    setVoucherDiscount(discount);
    setVoucherFreeShip(voucher.voucher_type === "free_shipping");
    setVoucherMessage(`Áp dụng thành công mã ${clean}. Số tiền giảm chính xác sẽ hiện lại ở bước thanh toán.`);
    return true;
  };

  // Khôi phục voucher đã áp khi khách tải lại trang (giỏ tải xong mới tính lại được số tiền giảm)
  const voucherRestored = useRef(false);
  useEffect(() => {
    if (voucherRestored.current || cartLoading || cart.length === 0 || voucherCode) return;
    voucherRestored.current = true;
    const stored = readVoucherCode();
    if (stored) applyVoucher(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, cartLoading, voucherCode]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  // Giỏ chưa biết tỉnh nhận hàng: ước tính theo mức tỉnh khác, checkout tính lại theo tỉnh thật
  const shippingFee = calcShippingFee("", subtotal);
  const total = Math.max(0, subtotal + shippingFee - voucherDiscount);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isLoadingAuth,
        user,
        login,
        logout,
        refreshUser,
        pets,
        petsLoading,
        addPet,
        updatePet,
        deletePet,
        cart,
        cartLoading,
        addToCart,
        updateQuantity,
        updatePetForBox,
        removeFromCart,
        clearCart,
        voucherCode,
        voucherDiscount,
        voucherFreeShip,
        voucherMessage,
        applyVoucher,
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
