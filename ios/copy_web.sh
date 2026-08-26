set -euo pipefail

# 鑑定アプリの中身を、組み立てるたびに束の web/ へ写す。
#
# ここで一覧を持たない。持つと、web 側にファイルが増えたときに必ず取りこぼし、
# 「手元では動くのにアプリでは出ない」という当てにくい不具合になる。
# 除くものだけを挙げ、あとは丸ごと写す。

SRC="$SRCROOT"
DST="$BUILT_PRODUCTS_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/web"

rm -rf "$DST"
mkdir -p "$DST"

# 除くもの:
#   元資料（PDF・xlsx）  … アプリから読まない。束に入れれば取り出せてしまう
#   ios/               … 器そのもの
#   scripts/           … 手元の道具
#   .git .claude など  … 手元の設え
rsync -a \
  --exclude '.git/' \
  --exclude '.claude/' \
  --exclude '.wrangler/' \
  --exclude '.DS_Store' \
  --exclude 'ios/' \
  --exclude 'scripts/' \
  --exclude 'node_modules/' \
  --exclude '*.pdf' \
  --exclude '*.xlsx' \
  --exclude '*.command' \
  --exclude 'README.md' \
  --exclude 'wrangler.toml' \
  --exclude '.assetsignore' \
  --exclude '.gitignore' \
  --exclude 'Kyusei.xcodeproj/' \
  --exclude 'build/' \
  "$SRC/" "$DST/"

# service worker は要らない。束の中から読むので、控える相手がいない。
# 置いたままだと登録に失敗して console に赤が出る。
rm -f "$DST/service-worker.js"

# 入口があることを確かめる。無ければ白い画面になるだけで、原因が分からない。
if [ ! -f "$DST/index.html" ]; then
  echo "error: 鑑定アプリの index.html を写せませんでした（$DST）"
  exit 1
fi

echo "note: 鑑定アプリを写しました（$(find "$DST" -type f | wc -l | tr -d ' ') 件）"
