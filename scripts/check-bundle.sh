#!/bin/bash
#
# 組み上げた束に、入れてよいものだけが入っているかを見る。
#
#   scripts/check-bundle.sh [束への道]
#
# 元資料（早見表など）は住職の手によるものだが、アプリからは読まない。
# 束に入れれば取り出せてしまうので、入っていないことを確かめる。
#
set -uo pipefail

cd "$(dirname "$0")/.."
APP="${1:-build/dd/Build/Products/Debug-iphonesimulator/Kyusei.app}"

if [ ! -d "$APP" ]; then
  echo "✗ 束が見あたりません: $APP"
  echo "  先に組み立ててください。"
  exit 1
fi

bad=0
ok()  { echo "✓ $1${2:+  $2}"; }
ng()  { echo "✗ $1${2:+  $2}"; bad=$((bad+1)); }

echo "── 束の中を検める ──"
echo "  $APP"
echo

# 入っていなければならないもの
for p in web/index.html web/clients.html web/history.html web/privacy.html \
         web/css/style.css web/js/app.js web/js/storage.js \
         PrivacyInfo.xcprivacy Info.plist; do
  [ -e "$APP/$p" ] && ok "$p がある" || ng "$p が無い"
done

# 入っていてはならないもの
for pat in "*.pdf" "*.xlsx" "service-worker.js" "*.command" "README.md" \
           "wrangler.toml" ".assetsignore" "project.yml"; do
  found=$(find "$APP" -name "$pat" 2>/dev/null | head -3)
  [ -z "$found" ] && ok "$pat は入っていない" || ng "$pat が入っている" "$found"
done

# 退避したはずの未使用データ
for f in kan-data.js kyusei-meaning-data.js hizu-data.js houi-data.js gogyou-data.js; do
  found=$(find "$APP" -name "$f" 2>/dev/null | head -1)
  [ -z "$found" ] && ok "$f は入っていない" || ng "$f が入っている" "$found"
done

# 四盤のウィジェット。計算の JS と盤の組み方だけを持ち、相談者の記録（web/）は持たない
W="$APP/PlugIns/KyuseiWidget.appex"
for p in solar-terms.js eto.js kyusei.js kantei.js yonban.js Info.plist; do
  [ -e "$W/$p" ] && ok "ウィジェットに $p がある" || ng "ウィジェットに $p が無い"
done
[ ! -e "$W/web" ] && ok "ウィジェットは鑑定アプリの画面を持たない" || ng "ウィジェットに web/ が入っている"
[ -e "$APP/yonban.js" ] && ok "yonban.js がある（自己確認で突き合わせる）" || ng "yonban.js が無い"

# 申告のたぐい
for key in NSMicrophoneUsageDescription NSSpeechRecognitionUsageDescription \
           NSFaceIDUsageDescription ITSAppUsesNonExemptEncryption \
           CFBundleIdentifier CFBundleDisplayName; do
  if plutil -extract "$key" raw "$APP/Info.plist" >/dev/null 2>&1; then
    ok "$key がある" "$(plutil -extract "$key" raw "$APP/Info.plist" 2>/dev/null | head -c 40)"
  else
    ng "$key が無い"
  fi
done

echo
n=$(find "$APP/web" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "同梱した鑑定アプリ ${n} 件"
[ "$bad" -eq 0 ] && echo "── すべて通りました ──" || echo "── 通らなかったもの ${bad}件 ──"
exit $((bad > 0))
