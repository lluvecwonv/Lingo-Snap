#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 컨텐츠 카드 네비게이션 수정 중..."

python3 << 'PYEOF'
filepath = "frontend/contents.html"
with open(filepath, "r") as f:
    data = f.read()

# 1. getContentHref 함수 추가 (renderGrid 함수 안, grid.innerHTML 바로 위)
if "getContentHref" not in data:
    # noMsg.classList.add('hidden'); 바로 다음에 함수 삽입
    anchor = "noMsg.classList.add('hidden');"
    func = """noMsg.classList.add('hidden');

      function getContentHref(content) {
        const seasonalPlatforms = ['netflix', 'youtube'];
        const base = seasonalPlatforms.includes(content.platform) ? '/seasons' : '/expressions';
        return `${base}?content_id=${content.id}`;
      }"""
    if anchor in data:
        data = data.replace(anchor, func, 1)
        print("✅ getContentHref 함수 추가 완료!")
    else:
        print("❌ anchor 패턴을 찾을 수 없습니다")
        import sys; sys.exit(1)

# 2. onclick에서 /expressions 직접 링크를 getContentHref 사용으로 변경
old_onclick = "onclick=\"window.location.href='/expressions?content_id=${c.id}'\""
new_onclick = "onclick=\"window.location.href='${getContentHref(c)}'\""

if old_onclick in data:
    data = data.replace(old_onclick, new_onclick)
    print("✅ onclick 네비게이션 변경 완료!")
elif new_onclick in data:
    print("⏭️  onclick 이미 수정됨 — 스킵")
else:
    print("⚠️  onclick 패턴이 다릅니다. 수동 확인 필요:")
    for i, line in enumerate(data.split('\n'), 1):
        if 'onclick' in line and 'content' in line.lower():
            print(f"   Line {i}: {line.strip()[:150]}")

with open(filepath, "w") as f:
    f.write(data)

print("\n🎬 수정 완료!")
PYEOF

echo ""
echo "자동으로 commit & push 합니다..."
git add frontend/contents.html
git commit -m "fix: route netflix/youtube contents through seasons page"
git push
echo "✅ 완료!"
