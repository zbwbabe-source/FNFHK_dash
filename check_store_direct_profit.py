import json
from collections import defaultdict

def main():
    with open("components/dashboard/hongkong-store-status.json", encoding="utf-8") as f:
        data = json.load(f)

    categories = data.get("categories", {})

    summary = {}
    total_stores = 0
    total_direct = 0.0

    for cat_key, cat in categories.items():
        stores = cat.get("stores", [])
        total_stores += len(stores)
        direct_sum = sum(s.get("current", {}).get("direct_profit", 0.0) for s in stores)
        total_direct += direct_sum
        summary[cat_key] = {
            "count": len(stores),
            "direct_profit_sum": round(direct_sum, 1),
        }

    print("=== Hong Kong store direct profit by category (1K HKD) ===")
    for k, v in summary.items():
        print(f"{k:18s}: {v['count']:2d}개 매장, 합계 {v['direct_profit_sum']}K")

    print(f"\n전체 매장 수: {total_stores}")
    print(f"직접이익 합계: {round(total_direct, 1)}K")


if __name__ == "__main__":
    main()


