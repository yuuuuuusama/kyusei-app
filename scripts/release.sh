#!/bin/bash
#
# 九星鑑定（iPhone アプリ）を TestFlight へ出す。荘厳・法輪の scripts/release.sh と同じ作り。
#
# 鑑定アプリの中身（HTML・JS）は組み立てのたびに ios/copy_web.sh が丸ごと写すので、
# Web 側を直したら、そのままこれを流せばアプリにも入る。
#
#   scripts/release.sh              書き出しまで（.ipa を作る）
#   scripts/release.sh upload       書き出して App Store Connect へ送る
#
# 送るには発行者ID（Issuer ID）が要る。App Store Connect の
# ［ユーザとアクセス］→［Integrations］→［App Store Connect API］に出ている UUID。
#
# 置き場は二つ。どちらでもよい。
#
#   ~/.myodenji/asc_issuer_id      控えておく（chmod 600）。以後は何も渡さずに送れる
#   export ASC_ISSUER_ID="..."     その場で渡す。こちらが優先
#
# 鍵そのもの（AuthKey_*.p8）は ~/.appstoreconnect/private_keys/ に置く。
# **どちらの中身も出力に書かないこと。**
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
BUILD="$ROOT/build/release"
ARCHIVE="$BUILD/Kyusei.xcarchive"
EXPORT="$BUILD/export"
KEY_ID="43C7HV2U64"   # ~/.appstoreconnect/private_keys/AuthKey_<これ>.p8

echo "▼ 版を上げる"
# 送るたびにビルド番号を上げないと App Store Connect が受け取らない。
# 日時から作るので、手で数えなくてよい。
BUILD_NUMBER="$(date +%Y%m%d%H%M)"
echo "  ビルド番号 $BUILD_NUMBER"

echo "▼ Archive を作る"
rm -rf "$ARCHIVE" "$EXPORT"
mkdir -p "$BUILD"
xcodebuild archive \
  -project Kyusei.xcodeproj \
  -scheme Kyusei \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  | grep -E "error:|\*\* ARCHIVE" || true

if [ ! -d "$ARCHIVE" ]; then
  echo "✗ Archive を作れませんでした"
  exit 1
fi

echo "▼ 書き出す"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist ios/distribution/ExportOptions.plist \
  -exportPath "$EXPORT" \
  -allowProvisioningUpdates \
  | grep -E "error|EXPORT" || true

IPA="$EXPORT/九星鑑定.ipa"
[ -f "$IPA" ] || IPA="$(ls "$EXPORT"/*.ipa 2>/dev/null | head -1)"
if [ ! -f "$IPA" ]; then
  echo "✗ .ipa を作れませんでした"
  exit 1
fi

echo "✓ できました: $IPA"

echo "▼ 束の中を検める（元資料が入っていないか）"
if ! scripts/check-bundle.sh "$ARCHIVE/Products/Applications/Kyusei.app" >"$BUILD/check.log" 2>&1; then
  echo "✗ 束に入れてはならないものがあります。送っていません。"
  grep "✗" "$BUILD/check.log"
  exit 1
fi
echo "  通りました"
codesign -dvvv "$EXPORT" 2>/dev/null || true

if [ "${1:-}" != "upload" ]; then
  cat <<'NOTE'

── ここから先 ──

Xcode で送る場合:
  Xcode →［Window］→［Organizer］→ 左の Archives から選んで
  ［Distribute App］→［App Store Connect］

この本で送る場合:
  scripts/release.sh upload
  （発行者IDは ~/.myodenji/asc_issuer_id を見る。無ければ ASC_ISSUER_ID で渡す）

いずれも、先に App Store Connect でアプリを登録しておくこと。
  Bundle ID: jp.myodenji.kyusei
NOTE
  exit 0
fi

# 控えてあれば、それを使う。環境変数が入っていればそちらを優先する。
ISSUER_FILE="$HOME/.myodenji/asc_issuer_id"
if [ -z "${ASC_ISSUER_ID:-}" ] && [ -f "$ISSUER_FILE" ]; then
  ASC_ISSUER_ID="$(tr -d '[:space:]' < "$ISSUER_FILE")"
fi

if [ -z "${ASC_ISSUER_ID:-}" ]; then
  echo "✗ 発行者ID（Issuer ID）が要ります。App Store Connect の"
  echo "  ［ユーザとアクセス］→［Integrations］→［App Store Connect API］に出ている UUID を"
  echo "  $ISSUER_FILE へ控える（chmod 600）か、ASC_ISSUER_ID で渡してください。"
  exit 1
fi

# altool は失敗しても言い分を標準出力へ書く。
# パイプで受けると終了の可否が消えるので、いったんファイルへ落として調べる。
LOG="$BUILD/altool.log"

echo "▼ まず検証する"
if ! xcrun altool --validate-app -f "$IPA" -t ios \
     --apiKey "$KEY_ID" --apiIssuer "$ASC_ISSUER_ID" >"$LOG" 2>&1; then
  echo "✗ 検証で止まりました。送っていません。"
  echo
  grep -E "ERROR|error:" "$LOG" | head -20
  echo
  echo "（すべて: ${LOG}）"
  exit 1
fi
echo "  検証は通りました"

echo "▼ 送る"
if ! xcrun altool --upload-app -f "$IPA" -t ios \
     --apiKey "$KEY_ID" --apiIssuer "$ASC_ISSUER_ID" >"$LOG" 2>&1; then
  echo "✗ 送れませんでした。"
  echo
  grep -E "ERROR|error:" "$LOG" | head -20
  echo
  echo "（すべて: ${LOG}）"
  exit 1
fi

echo "✓ 送りました。App Store Connect の TestFlight に現れるまで数分かかります。"
echo "  ビルド番号 $BUILD_NUMBER"
