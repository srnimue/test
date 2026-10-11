お取引ノート v0.6.2
・iPhone Safariの日付/日時入力欄の横幅対策をラッパー方式に変更
・自分の発送日 / 相手の発送日 / 手渡し日時を .date-wrap で包む
・枠・角丸・左右paddingはラッパー側へ移動
・date / datetime-local 本体は padding:0 / border:0 / width:100% にしてWebKitの幅計算バグを回避
・appearance:none は使用していないため、日付選択UIは維持
・v0.6.1までの機能は維持
