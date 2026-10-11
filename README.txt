お取引ノート v0.6.1
・iPhone Safariで日付/日時入力欄だけ横幅がはみ出す問題への対策を追加
  - grid-template-columns: repeat(2, minmax(0, 1fr))
  - date / datetime-local に min-width: 0
  - width / max-width: 100%
  - -webkit-min-logical-width: 0
  - paddingを0 12pxに統一
・スマホ時は従来どおり1カラム表示
・v0.6の機能と動作はそのまま維持
