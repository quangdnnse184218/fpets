// Đề xuất món cho một Mystery Box (SPEC §3, tuyển chọn hộp phía admin).
// Hàm thuần, không gọi DB: nhận các món đã lọc theo loài, size, tuổi của bé và trả về tổ hợp tốt nhất
// để admin chỉ cần xem qua rồi duyệt.

export interface SuggestCandidate {
  id: string;
  price: number;
  category: "food" | "toy" | "accessory";
  isAllergic: boolean;
  wasSentBefore: boolean;
  wasDisliked: boolean;
  // Món dùng hết rồi mua lại được (đồ ăn, đồ vệ sinh): gửi lặp lại ít phiền hơn đồ chơi, phụ kiện
  isConsumable: boolean;
  matchedPreferences: string[];
}

export interface BoxRule {
  minRetailValue: number;
  itemCountMin: number;
  itemCountMax: number;
}

// Tổng giá trị đề xuất nằm trong khoảng [tối thiểu, tối thiểu + mức này] khi kho cho phép
export const SUGGEST_TOLERANCE = 20000;

// Điểm phạt của một tổ hợp, điểm càng thấp càng tốt. Các mức cách nhau đủ xa để thứ tự ưu tiên là:
// 1. không gửi món bé đã chấm "không thích"
// 2. đủ 3 nhóm món (ăn, chơi, chăm sóc/phụ kiện) và đúng số món quy định của loại hộp
// 3. không gửi lại đồ chơi, phụ kiện bé đã nhận
// 4. tổng giá trị vượt mức tối thiểu không quá SUGGEST_TOLERANCE
// 5. hạn chế gửi lại đồ ăn, đồ vệ sinh bé đã nhận
// 6. nhiều món hợp sở thích của bé
// 7. số món giữa 3 nhóm cân đối, cuối cùng là sát mức tối thiểu nhất
// Số món là chỉ tiêu của loại hộp nên xếp trên việc tránh món đã gửi: kho thiếu món mới thì hộp vẫn đúng số món
// và dùng lại món cũ (màn hình báo rõ cho admin), chỉ vượt số món khi không còn cách nào đạt giá trị tối thiểu.
const PENALTY = {
  disliked: 1_000_000,
  missingGroup: 300_000,
  missingItem: 50_000,
  extraItem: 30_000,
  durableRepeat: 10_000,
  outOfTolerance: 1_500,
  consumableRepeat: 1_000,
  preference: -100,
  unbalanced: 30,
};

const GROUPS: SuggestCandidate["category"][] = ["food", "toy", "accessory"];
const UNREACHED = 2 ** 30;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const sumPrice = (items: SuggestCandidate[]) => items.reduce((s, c) => s + c.price, 0);

function itemPenalty(c: SuggestCandidate): number {
  return (
    (c.wasDisliked ? PENALTY.disliked : 0) +
    (c.wasSentBefore ? (c.isConsumable ? PENALTY.consumableRepeat : PENALTY.durableRepeat) : 0) +
    (c.matchedPreferences.length > 0 ? PENALTY.preference : 0)
  );
}

/**
 * Chọn món cho hộp: tổng giá trị đạt mức tối thiểu và sát mức đó nhất có thể, đúng số món quy định,
 * có đủ món ăn, đồ chơi và đồ chăm sóc/phụ kiện, ưu tiên món hợp sở thích và tránh món bé đã nhận.
 * Không bao giờ chọn món chứa thành phần bé dị ứng.
 *
 * Cách tính: quy hoạch động theo (số món mỗi nhóm, tổng giá trị), giữ điểm phạt thấp nhất cho từng trạng thái,
 * nên kết quả là tổ hợp tốt nhất thật sự chứ không phải chọn tham lam theo giá.
 */
export function suggestBoxItems<T extends SuggestCandidate>(candidates: T[], rule: BoxRule): T[] {
  const pool = candidates.filter((c) => !c.isAllergic && c.price > 0);
  const min = rule.minRetailValue;
  // Kho không đủ món để đạt giá trị tối thiểu: trả về mọi món bé dùng được để admin thấy còn thiếu bao nhiêu
  if (sumPrice(pool) < min) return pool.filter((c) => !c.wasDisliked);

  // Đổi giá về đơn vị chung (thường là 1.000₫) để bảng tính nhỏ. Giá lẻ bất thường thì làm tròn xuống theo 1.000₫
  // và làm tròn lên mức tối thiểu: tổng thật luôn đạt mức tối thiểu khi tổng đã quy đổi đạt.
  let unit = pool.reduce((g, c) => gcd(g, Math.round(c.price)), Math.round(min));
  if (unit < 500) unit = 1000;
  const price = pool.map((c) => Math.floor(c.price / unit));
  const minU = Math.ceil(min / unit);

  const groupOf = pool.map((c) => Math.max(0, GROUPS.indexOf(c.category)));
  const available = GROUPS.map((_, g) => groupOf.filter((x) => x === g).length);
  const cap = available.map((n) => Math.min(n, rule.itemCountMax));

  // Tổng lớn nhất cần xét: tổ hợp tốt nhất không bao giờ vượt mức tối thiểu quá một món đắt nhất,
  // trừ khi số món tối thiểu buộc phải vượt.
  const maxPrice = Math.max(...price);
  const cheapest = [...price].sort((a, b) => a - b).slice(0, rule.itemCountMin).reduce((s, p) => s + p, 0);
  const capU = Math.max(minU, cheapest) + maxPrice;

  const width = capU + 1;
  const stride = [(cap[1] + 1) * (cap[2] + 1) * width, (cap[2] + 1) * width, width];
  const size = (cap[0] + 1) * stride[0];
  const best = new Int32Array(size).fill(UNREACHED);
  const chain = new Int32Array(size).fill(-1);
  // Danh sách món của từng trạng thái lưu dạng chuỗi nối ngược (món cuối, chuỗi trước đó)
  const chainItem: number[] = [];
  const chainPrev: number[] = [];
  best[0] = 0;

  for (let i = 0; i < pool.length; i++) {
    const g = groupOf[i];
    const p = price[i];
    const w = itemPenalty(pool[i]);
    // Duyệt số món giảm dần để mỗi món chỉ được dùng một lần
    for (let c0 = cap[0]; c0 >= (g === 0 ? 1 : 0); c0--) {
      for (let c1 = cap[1]; c1 >= (g === 1 ? 1 : 0); c1--) {
        for (let c2 = cap[2]; c2 >= (g === 2 ? 1 : 0); c2--) {
          const base = c0 * stride[0] + c1 * stride[1] + c2 * stride[2];
          const from = base - stride[g];
          for (let s = capU; s >= p; s--) {
            const before = best[from + s - p];
            if (before === UNREACHED || before + w >= best[base + s]) continue;
            best[base + s] = before + w;
            chainItem.push(i);
            chainPrev.push(chain[from + s - p]);
            chain[base + s] = chainItem.length - 1;
          }
        }
      }
    }
  }

  const toleranceU = SUGGEST_TOLERANCE / unit;
  let chosen = -1;
  let chosenScore = UNREACHED;
  let chosenSum = 0;
  for (let c0 = 0; c0 <= cap[0]; c0++) {
    for (let c1 = 0; c1 <= cap[1]; c1++) {
      for (let c2 = 0; c2 <= cap[2]; c2++) {
        const counts = [c0, c1, c2];
        const count = c0 + c1 + c2;
        // Lệch giữa nhóm nhiều món nhất và ít món nhất; lệch 1 món là bình thường (ví dụ 2/2/1)
        const spread = Math.max(0, Math.max(...counts) - Math.min(...counts) - 1);
        const shape =
          counts.filter((c, g) => c === 0 && available[g] > 0).length * PENALTY.missingGroup +
          Math.max(0, rule.itemCountMin - count) * PENALTY.missingItem +
          Math.max(0, count - rule.itemCountMax) * PENALTY.extraItem +
          spread * PENALTY.unbalanced;
        const base = c0 * stride[0] + c1 * stride[1] + c2 * stride[2];
        for (let s = minU; s <= capU; s++) {
          if (best[base + s] === UNREACHED) continue;
          const over = s - minU;
          // Ngoài khoảng cho phép: phạt thêm theo mỗi 1.000₫ vượt để vẫn chọn tổ hợp sát nhất
          const far = over > toleranceU ? PENALTY.outOfTolerance + Math.round(((over - toleranceU) * unit) / 100) : 0;
          const score = best[base + s] + shape + far;
          if (score < chosenScore || (score === chosenScore && s < chosenSum)) {
            chosen = chain[base + s];
            chosenScore = score;
            chosenSum = s;
          }
        }
      }
    }
  }

  if (chosen === -1) return fillByValue(pool, min);

  const picked: T[] = [];
  for (let node = chosen; node !== -1; node = chainPrev[node]) picked.push(pool[chainItem[node]]);
  return picked.sort((a, b) => GROUPS.indexOf(a.category) - GROUPS.indexOf(b.category) || b.price - a.price);
}

// Dự phòng khi bảng tính không có tổ hợp nào (kho toàn món giá thấp, cần nhiều món hơn hẳn quy định):
// lấy dần món ít bị phạt nhất, giá cao trước, tới khi đạt giá trị tối thiểu.
function fillByValue<T extends SuggestCandidate>(pool: T[], min: number): T[] {
  const ordered = [...pool].sort((a, b) => itemPenalty(a) - itemPenalty(b) || b.price - a.price);
  const picked: T[] = [];
  let total = 0;
  for (const item of ordered) {
    if (total >= min) break;
    picked.push(item);
    total += item.price;
  }
  return picked;
}
