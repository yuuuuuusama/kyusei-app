#!/bin/bash
#
# App Store Connect へ出す束を組む。
#
#   scripts/archive.sh            組んで .ipa を build/export/ に置く
#   scripts/archive.sh --upload   組んで、そのまま App Store Connect へ送る
#
# 組み番号（CFBundleVersion）は日時から作る。送るたびに違う番号が要るので、
# 手で上げ忘れて弾かれることが無いように。
# 表に出る版（1.0 など）は MARKETING_VERSION で、上げるときは
# scripts/generate_ios_project.py の MARKETING_VERSION を直して書き出し直す。
#
# 送るには、Xcode に Apple ID（チーム P7442B37HP）でサインインしてあること。
#
set -euo pipefail

cd "$(dirname "$0")/.."

DEST=export
[ "${1:-}" = "--upload" ] && DEST=upload

BUILD_NO="$(date +%Y%m%d%H%M)"
ARCHIVE="build/Kyusei.xcarchive"
EXPORT="build/export"
OPTS="build/ExportOptions.plist"

rm -rf "$ARCHIVE" "$EXPORT"
mkdir -p build

echo "── 組む（組み番号 $BUILD_NO）──"
xcodebuild archive \
  -project Kyusei.xcodeproj \
  -scheme Kyusei \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  CURRENT_PROJECT_VERSION="$BUILD_NO"

echo
echo "── 束の中を検める ──"
scripts/check-bundle.sh "$ARCHIVE/Products/Applications/Kyusei.app"

echo
echo "── 書き出す（$DEST）──"
cp ios/ExportOptions.plist "$OPTS"
plutil -replace destination -string "$DEST" "$OPTS"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT" \
  -exportOptionsPlist "$OPTS" \
  -allowProvisioningUpdates

if [ "$DEST" = upload ]; then
  echo "✓ App Store Connect へ送りました（組み番号 $BUILD_NO）。処理が済むと TestFlight に出ます。"
else
  echo "✓ $EXPORT に書き出しました（組み番号 $BUILD_NO）。"
fi
