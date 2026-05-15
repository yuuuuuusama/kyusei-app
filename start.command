#!/bin/bash
# ダブルクリックで起動するMac用ランチャ
# Macで http://localhost:8765 と http://<MacのIP>:8765 でアプリを公開

cd "$(dirname "$0")"

# 既存のサーバが残っていれば停止
PID=$(lsof -ti :8765 2>/dev/null)
if [ -n "$PID" ]; then
  kill -9 $PID 2>/dev/null
fi

# MacのローカルIPを取得 (iPhoneと同じWi-Fi上)
IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ -z "$IP" ]; then
  IP=$(ipconfig getifaddr en1 2>/dev/null)
fi
if [ -z "$IP" ]; then
  IP="192.168.x.x"
fi

echo "========================================"
echo " 干支九星気学 鑑定アプリ"
echo "========================================"
echo ""
echo " このMacから: http://localhost:8765/"
echo " iPhoneから:  http://${IP}:8765/"
echo ""
echo " ※ iPhoneは同じWi-Fiに接続してください"
echo " ※ Safariで上記URLを開く → 共有 →"
echo "   「ホーム画面に追加」でアプリ化"
echo ""
echo " 停止するには このターミナルを閉じてください (Ctrl+C)"
echo "========================================"
echo ""

# 自動でブラウザ起動
sleep 1
open "http://localhost:8765/" &

python3 -m http.server 8765
