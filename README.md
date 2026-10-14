# Zeta アプリ直行リンクメーカー v3

Zetaのプロット共有URLから、アプリ内の「プロット紹介画面」を直接開くリンクを生成する静的Webツールです。

## 対応状況
- iOS: 実機で動作確認済み
- Android: 未検証

## 変換形式
### iOS
`https://zeta-ai.app.link/beta/jp?$ios_deeplink_path=ja/plots/{PLOT_UUID}/profile`

### Android
`https://zeta-ai.app.link/beta/jp?$android_deeplink_path=ja/plots/{PLOT_UUID}/profile`

※ Androidは未検証です。
※ Zetaの非公開仕様に依存するため、今後の仕様変更で動作しなくなる可能性があります。
