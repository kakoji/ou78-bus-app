# 王78バス確認アプリ v3

v3ではiPhone側で都バス全体のGTFS ZIPを直接読み込まない構成に変更しました。

GitHub Actionsが公式GTFSから王78 南常盤台→王子五丁目だけを抽出し、route-data.json を作ります。

表示URL:
https://kakoji.github.io/ou78-bus-app/?v=3

この版は、まず時刻表と停留所一覧の安定表示を優先しています。リアルタイム遅れ表示は次版で再接続します。
