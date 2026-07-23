import { useReducer, useEffect, useRef, useState, useCallback } from "react";

// ── Firebase SDK（環境変数で設定・GitHubには鍵を残さない） ──────────────
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, getDoc, setDoc, increment, arrayUnion, arrayRemove, runTransaction, serverTimestamp, query, where, orderBy, limit } from "firebase/firestore";

import kokoronSmile from "./assets/kokoron_smile.png";
import kokoronSparkle from "./assets/kokoron_sparkle.png";

// ══════════════════════════════════════════════════
// 🎨 まごころ配色トークン（もちクリーム × あずき × どんぐり）
// ══════════════════════════════════════════════════
const THEME = {
  bg: "#EFEAE0",
  ink: "#2F3B2E",
  textSecondary: "#6B6F64",
  textMuted: "#93958A",
  accentRed: "#A63446",
  accentAmber: "#C08A3E",
  moss: "#6B8F71",
  line: "#D9D2C2",
  cardBg: "#FBF8F2",
  frameBg: "#FFFFFF",
};

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
};

// 二重初期化を防ぐ（Viteのホットリロード対策）
const fbApp  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const fbDb   = getFirestore(fbApp);

// ══════════════════════════════════════════════════
// 🖼️ 写真ユーティリティ（SVGサンプル生成／実ファイル読み込みは本体側）
// ══════════════════════════════════════════════════
function makePhoto(emoji, c1, c2) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='600' height='300' fill='url(%23g)'/><text x='300' y='185' font-size='110' text-anchor='middle'>${emoji}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg).replace(/%2523/g, "%23");
}
const PHOTO_PRESETS = [
  ["🎁", "#FFE3C7", "#FFAB76"], ["🍫", "#F3E2D0", "#C89F7B"], ["💐", "#FDE2EC", "#F5A8C5"],
  ["🏔️", "#DCEBF7", "#8FBCE0"], ["🍪", "#FFF0D9", "#E8B87C"], ["💌", "#FDEBF0", "#F0A8B8"],
];

// ══════════════════════════════════════════════════
// 🌱 こころん（まごころのマスコット）
// 丸いもち状の精霊。頭に小さな双葉、ハート型のギフトを両手でそっと胸元に持つ。
// 表情は今のところ2種（笑顔・キラキラ）だけ。無理に増やさず、必要になったら足す。
// ══════════════════════════════════════════════════
const KOKORON_SPARKLE_EXPRESSIONS = new Set(["happy", "celebrate", "tokimeki", "wink", "surprised"]);

const Kokoron = ({ size = 90, expression = "idle", isTalking = false }) => {
  const isSparkle = KOKORON_SPARKLE_EXPRESSIONS.has(expression);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, animation: "hatoBob 3.2s ease-in-out infinite" }}>
      <img
        src={isSparkle ? kokoronSparkle : kokoronSmile}
        alt="こころん"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
      {isSparkle && <div style={{ position: "absolute", top: "-8px", right: "-6px", fontSize: size * .18, animation: "floatHeart 1.2s ease-in-out infinite" }}>✨</div>}
      {isTalking && <div style={{ position: "absolute", bottom: "-10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "3px", alignItems: "flex-end" }}>{[0, 1, 2, 3, 4].map(i => <div key={i} style={{ width: "3px", background: THEME.accentAmber, borderRadius: "2px", animation: "sw 0.5s ease-in-out infinite", animationDelay: `${i * .1}s` }} />)}</div>}
    </div>
  );
};

// ══════════════════════════════════════════════════
// 🌐 言語定義
// ══════════════════════════════════════════════════
const LANG = {
  ja: {
    appSub: "お土産・ギフトレビュー", postBtn: "+ 投稿する", switchLabel: "EN",
    heroTitle: '"あの贈り物、よかったよ"', heroSub: "が集まる場所",
    heroDesc: "モノも、コトも、言葉も。贈った体験と、もらった気持ちをシェアしよう。",
    toLabel: "贈り先：", shareBtn: "↗ シェア", justNow: "たった今", myName: "あなた", myAvatar: "あ",
    font: "'M PLUS Rounded 1c', sans-serif",
    navHome: "ホーム", navSearch: "さがす", navPost: "投稿", navGift: "ギフト", navMe: "マイページ",
    chatTitle: "こころんAIチャット", chatSub: "文脈を覚えて、わからないことはネットで調べる🌐",
    chatPlaceholder: "こころんに聞いてみる...",
    chatWelcome: "こんにちは！ぼく、こころんだよ🌱\nお土産・ギフトのおすすめはもちろん、「〇〇の歴史を調べて」みたいな質問なら、ネットで調べて答える🌐",
    quickExamples: ["旭川のおすすめお土産は？", "六花亭のおすすめ商品は？", "生チョコ使った旭川のクッキーって何だっけ？", "新千歳空港のお土産は？", "函館でダイエット中なんだけど…"],
    chatNewBtn: "＋ 新しいチャット", chatHistoryBtn: "🕘 履歴", chatDefaultTitle: "新しいチャット",
    chatThinking: "考え中…", chatSearchingWeb: "🌐 ネットで調べてる…",
    swipeHint: "← 左右スワイプでタブ移動できる →",
    reviewReasonLabel: "💡 買った理由・選んだ理由",
    reviewReasonPh: "例：函館旅行のお土産に、地元の味を贈りたかった",
    reviewReactionLabel: "😊 相手の反応・自分の気持ち",
    reviewReactionPh: "例：食べた瞬間に「これ美味しい！」と電話がきました",
    reviewNoteLabel: "✨ 感想・おすすめポイント（どこで買ったかも）",
    reviewNotePh: "例：スープの深みが函館っぽい。函館駅ビルで購入、箱もきれいで渡しやすい",
    reviewHeartLabel: "🕊️ 選んだとき、どんな気持ちでしたか？（任意）",
    reviewHeartPh: "例：喜ぶ顔が見たかった",
    reviewHeartHint: "「喜んでくれたらいいな」だけでも、立派なまごころ。ふと浮かんだ気持ちがあれば、ひとことどうぞ。",
    cardReasonLabel: "買った理由", cardReactionLabel: "相手の反応", cardNoteLabel: "感想・おすすめポイント", cardHeartLabel: "込めたまごころ",
    previewTitle: "🎁 こころんチェック＆投稿プレビュー",
    previewEmpty: "上の欄に入力すると、ここにプレビューが表示されて、こころんがリアルタイムでチェックする！",
    photoBtn: "📸 写真を撮る・選ぶ", photoSelected: "📸 写真をセットした！（タップで変更）", samplePhotoBtn: "🎲 サンプル写真",
    checkPending: "レビューを書いたら、こころんが自動でチェックする！",
    checkGateNote: "⚠️ こころんのチェックを通過すると投稿できる",
    giftNameRequired: "🎁 贈り物の名前を入れると投稿できる",
    charUnit: "文字", reviewTooLong: " — 長すぎる、少し短くしてほしい🙏",
    submitBtn: "投稿する 🎁",
    postSearchPlaceholder: "投稿を検索（贈り物名・レビュー内容）",
    noMatchTitle: "一致する投稿が見つかりませんでした。", noMatchDesc: "キーワードやカテゴリを変えてみてください。",
    dbTitle: "📦 お土産データベース", dbSearchPlaceholder: "お土産名・地域・タグで検索", itemsUnit: "件",
    dbSearchNoMatch: "一致するお土産が見つからなかった…",
    otoriyoseNote: "現地に行けないときでも、大切な人にすぐ届けられる優しさを。こころんがお取り寄せをお手伝いする🎁",
    otoriyoseAd: "※価格・内容量は目安です／このリンクから購入すると、運営者に少額の紹介料が入ることがあります",
    otoriyoseHeading: "まごころを届けよう",
    searchRakuten: "楽天市場でさがす", searchAmazon: "Amazonでさがす",
    categories: ["すべて", "グルメ", "インテリア", "体験・チケット", "フラワー", "ファッション・アクセサリー", "美容", "雑貨・伝統工芸", "言葉・きもち", "行動・お手伝い"],
    moodTagOptions: ["ありがとうを伝えたくて", "お疲れさま、の気持ちで", "お祝いしたくて", "元気になってほしくて", "なんでもない日だけど", "懐かしくなって"],
    scenes: ["誕生日", "引越し祝い", "結婚記念日", "退職祝い", "出産祝い", "バレンタイン", "ホワイトデー", "母の日", "父の日", "日頃の感謝", "その他"],
    recipients: ["母", "父", "友人（女性）", "友人（男性）", "恋人", "配偶者", "兄弟・姉妹", "上司", "同僚", "祖父母", "両親", "子ども", "自分", "その他"],
    prices: ["プライスレス", "〜¥1,000", "¥1,000〜3,000", "¥3,000〜5,000", "¥5,000〜10,000", "¥10,000〜"],
    nearbyBtn: "📍 近くのお土産から探す", distanceUnit: "m先",
    nearbyFallbackNote: "現在地を取得できなかったので、旭川駅の周辺で表示してる！",
    locateBtn: "📍 現在地を使う", locating: "取得中…", locationSetNote: "現在地を設定した！",
    nearHere: "現在地付近",
    feedAll: "すべて", feedFollowing: "フォロー中",
    followBtn: "＋ フォロー", followingBtn: "✓ フォロー中",
    feedFollowingEmpty: "まだ誰もフォローしていない。気になる人の「＋ フォロー」を押してみて！",
    commentsTitle: "コメント", commentPh: "コメントを書く…", commentSend: "送信",
    replyBtn: "返信", replyPh: "返信を書く…", noComments: "まだコメントがない。最初のコメントを書いてみて！",
    quoteBtn: "🔁 引用して投稿", thanksBtn: "💝 もらった感想",
    quotedLabel: "🔁 引用元の投稿", thanksLabel: "💝 このギフトを受け取りました",
    quoteModeTitle: "🔁 引用して投稿する", thanksModeTitle: "💝 もらった感想を投稿する",
    thanksReasonLabel: "💝 もらったときの状況", thanksReasonPh: "例：誕生日に娘からもらいました",
    thanksReactionLabel: "🥰 もらった気持ち", thanksReactionPh: "例：驚きと嬉しさで、思わず笑顔になりました",
    authTagline: "だれかを想うスイッチ、ON。", authSubtitle: "お土産・ギフトのレビューをシェアしよう",
    authKokoronWelcomeBack: "おかえりなさい！",
    authLineBtn: "LINEログイン（準備中）",
    authIdpassBtn: "アカウントを作成",
    authAnonBtn: "お試しでのぞいてみる",
    authGuideMsg: "アカウント作成も、名前・メール・電話番号は一切いらない🌱 お好きなIDとパスワードを決めるだけ！\nとりあえず覗いてみたいだけなら「お試し」でOK、めんどうな設定は何もいらない✨\nLINEログインも近々使えるようになる予定🙏",
    authSwitchToLogin: "すでにアカウントをお持ちの方は", authSwitchToSignup: "はじめての方は",
    authLoginLink: "ログイン", authSignupLink: "新規登録",
    authPassword: "パスワード", authLoginId: "ログインID", authLoginIdHint: "半角英数字3〜20文字",
    authSubmitSignupId: "この内容で始める", authSubmitLoginId: "ログインする",
    authRecoveryTitle: "パスワードを忘れたときのための質問（任意）",
    authRecoveryHint: "設定しなくても登録できます。心配な方だけ、本人確認用に決めておけます",
    authRecoverySelectPh: "質問を選ぶ", authRecoveryAnswer: "答え",
    authErrLoginIdShort: "ログインIDは3文字以上で入力してください",
    authErrPasswordShort: "パスワードは6文字以上で入力してください",
    authErrNetwork: "サーバーに接続できなかった…時間をおいてもう一度試してほしい",
    authErrRequired: "ログインIDとパスワードを入力してほしい",
    authErrDuplicateId: "そのログインIDはもう使われてる。別のIDを試してほしい",
    authErrInvalidCredentials: "ログインIDかパスワードが正しくない",
    myEditName: "名前を変更", mySave: "保存", mySaving: "保存中…", myCancel: "キャンセル",
    myNameSaved: "変更した✓", myNameSaveError: "保存できなかった、もう一度試してほしい",
    myGuestNameNote: "ゲストの名前は固定。名前を変えたい時はIDとパスワードで登録してほしい",
    myEditAvatar: "写真を変更", myAvatarError: "写真を読み込めなかった、別の画像で試してほしい",
    myGuestAvatarNote: "ゲストは写真も設定できない。アカウントを作るとプロフィール写真を設定できる📷",
    authSubmitting: "送信中…",
    authWelcomeBackBody: "続きから、お土産の物語を集めていこう。",
    authSuccessTitle: "ようこそ、まごころへ！",
    authSuccessBody: "さっそく、お土産の物語を集めにいこう。",
    authSuccessCta: "はじめる", authLogout: "ログアウト",
    recoveryPresets: ["最初に飼ったペットの名前は？", "生まれた町の名前は？", "好きな映画のタイトルは？", "子供の頃のあだ名は？", "一番好きだった先生の名前は？"],
    memberIdLabel: "まごころ 会員 ID:",
    followingCountLabel: "フォロー中",
    modalTitle: "🎁 贈り物レビューを投稿",
    giftNameLabel: "贈り物の名前", giftNamePh: "例：肩もみ券30分／北海道スイーツセット",
    categoryLabel: "カテゴリ", sceneLabel: "シーン", recipientLabel: "贈り先", priceLabel: "価格帯",
    recipientNameLabel: "誰に贈りましたか？", recipientNamePh: "例：お世話になっている先輩",
    moodTagsLabel: "どんな気持ちで贈りましたか？（任意・2つまで）",
    firstPostBadge: "はじめまして", thanksHeartLabel: "ありがとう",
    notifBellLabel: "通知", notifEmpty: "まだ通知はないよ",
    notifCommentText: "さんからコメントが届いたよ", notifHeartText: "さんから「ありがとう」が届いたよ",
    notifHeartBatchText: "たくさんのあたたかさが届いてるよ",
    postToastText: "こころんが受け取ったよ！", nudgeText: "誰かのすてきな投稿、見てみる？",
  },
  en: {
    appSub: "Gift Review Community", postBtn: "+ Post Review", switchLabel: "한국어",
    heroTitle: '"That gift was perfect."', heroSub: " Share your gifting story.",
    heroDesc: "Things, experiences, even words. Share what you gave — and how it felt to receive.",
    toLabel: "To: ", shareBtn: "↗ Share", justNow: "Just now", myName: "You", myAvatar: "Y",
    font: "'M PLUS Rounded 1c','Inter','Helvetica Neue',sans-serif",
    navHome: "Home", navSearch: "Search", navPost: "Post", navGift: "Gifts", navMe: "Profile",
    chatTitle: "Kokoron AI Chat", chatSub: "Remembers context & searches the web 🌐",
    chatPlaceholder: "Ask Kokoron anything...",
    chatWelcome: "Hey there! I'm Kokoron!\nAsk me for gift picks, or things like \"look up the history of ___\" and I'll search the web 🌐",
    quickExamples: ["Asahikawa souvenir ideas?", "Any music boxes in Otaru?", "That chocolate cookie from Asahikawa?", "Souvenirs at New Chitose Airport?", "On a diet in Hakodate..."],
    chatNewBtn: "＋ New chat", chatHistoryBtn: "🕘 History", chatDefaultTitle: "New chat",
    chatThinking: "Thinking…", chatSearchingWeb: "🌐 Searching the web…",
    swipeHint: "← Swipe left/right to switch tabs →",
    reviewReasonLabel: "💡 Why you chose it",
    reviewReasonPh: "e.g. Wanted to bring a local taste back from my Hakodate trip",
    reviewReactionLabel: "😊 Their reaction / your feelings",
    reviewReactionPh: "e.g. She called me right away saying it was delicious!",
    reviewNoteLabel: "✨ Impressions & highlights (incl. where you bought it)",
    reviewNotePh: "e.g. The soup is so Hakodate. Bought at the station — lovely box too",
    reviewHeartLabel: "🕊️ How did you feel when you picked it? (optional)",
    reviewHeartPh: "e.g. Just wanted to see them smile",
    reviewHeartHint: "Even 'hoped they'd like it' counts. One line is plenty.",
    cardReasonLabel: "Why they chose it", cardReactionLabel: "The reaction", cardNoteLabel: "Impressions & Highlights", cardHeartLabel: "The heart behind it",
    previewTitle: "🎁 Kokoron Check & Post Preview",
    previewEmpty: "Fill in the fields above — your preview appears here and Kokoron checks it in real time!",
    photoBtn: "📸 Take / choose a photo", photoSelected: "📸 Photo set! (tap to change)", samplePhotoBtn: "🎲 Sample photo",
    checkPending: "Write your review and Kokoron will auto-check it!",
    checkGateNote: "⚠️ Pass Kokoron's check to unlock posting",
    giftNameRequired: "🎁 Add the gift's name to unlock posting",
    charUnit: " chars", reviewTooLong: " — a little too long, please shorten it 🙏",
    submitBtn: "Post Review 🎁",
    postSearchPlaceholder: "Search posts (gift name, review text)",
    noMatchTitle: "No matching posts found.", noMatchDesc: "Try a different keyword or category.",
    dbTitle: "📦 Souvenir Database", dbSearchPlaceholder: "Search by name, region, or tag", itemsUnit: " items",
    dbSearchNoMatch: "No matching souvenirs found…",
    otoriyoseNote: "Too far to visit? You can still send your magokoro today — Kokoron will help with the mail order 🎁",
    otoriyoseAd: "* Prices are approximate / buying through this link may earn the operator a small referral fee",
    otoriyoseHeading: "Send some magokoro",
    searchRakuten: "Search Rakuten", searchAmazon: "Search Amazon",
    categories: ["All", "Food & Drink", "Home & Decor", "Experiences", "Flowers", "Fashion & Accessories", "Beauty", "Crafts & Traditional Goods", "Words & Feelings", "Acts of Service"],
    moodTagOptions: ["Wanted to say thank you", "As a way to say well done", "To celebrate something", "Hoping to cheer them up", "Just an ordinary day", "Feeling nostalgic"],
    scenes: ["Birthday", "Housewarming", "Anniversary", "Farewell", "Baby Gift", "Valentine's", "White Day", "Mother's Day", "Father's Day", "Everyday Thanks", "Other"],
    recipients: ["Mother", "Father", "Female Friend", "Male Friend", "Partner", "Spouse", "Sibling", "Boss", "Colleague", "Grandparents", "Parents", "Child", "Myself", "Other"],
    prices: ["Priceless", "Under ¥1,000", "¥1,000–3,000", "¥3,000–5,000", "¥5,000–10,000", "¥10,000+"],
    nearbyBtn: "📍 Find souvenirs near me", distanceUnit: "m away",
    nearbyFallbackNote: "Couldn't get your location, showing near Asahikawa Station instead!",
    locateBtn: "📍 Use current location", locating: "Locating…", locationSetNote: "Location set!",
    nearHere: "Near current location",
    feedAll: "All", feedFollowing: "Following",
    followBtn: "+ Follow", followingBtn: "✓ Following",
    feedFollowingEmpty: "You're not following anyone yet. Tap \"+ Follow\" on posts you like!",
    commentsTitle: "Comments", commentPh: "Write a comment…", commentSend: "Send",
    replyBtn: "Reply", replyPh: "Write a reply…", noComments: "No comments yet. Be the first!",
    quoteBtn: "🔁 Quote & post", thanksBtn: "💝 I received this",
    quotedLabel: "🔁 Quoted post", thanksLabel: "💝 Received this gift",
    quoteModeTitle: "🔁 Quote & Post", thanksModeTitle: "💝 Post as the Receiver",
    thanksReasonLabel: "💝 How you received it", thanksReasonPh: "e.g. My daughter gave it to me on my birthday",
    thanksReactionLabel: "🥰 How it felt", thanksReactionPh: "e.g. Surprised and so happy — I couldn't stop smiling",
    authTagline: "Switch on. Think of someone.", authSubtitle: "Share your gifting stories.",
    authKokoronWelcomeBack: "Welcome back!",
    authLineBtn: "LINE Login (coming soon)",
    authIdpassBtn: "Create an account",
    authAnonBtn: "Just take a look (try it)",
    authGuideMsg: "Creating an account needs no name, email, or phone number🌱 Just pick any ID and password!\nJust want to peek around? \"Try it\" needs zero setup✨\nLINE login is coming soon too🙏",
    authSwitchToLogin: "Already have an account?", authSwitchToSignup: "New here?",
    authLoginLink: "Log in", authSignupLink: "Sign up",
    authPassword: "Password", authLoginId: "Login ID", authLoginIdHint: "3–20 letters/numbers",
    authSubmitSignupId: "Start with these details", authSubmitLoginId: "Log in",
    authRecoveryTitle: "A question for password recovery (optional)",
    authRecoveryHint: "You can skip this — only set it if you're worried about forgetting your password",
    authRecoverySelectPh: "Choose a question", authRecoveryAnswer: "Answer",
    authErrLoginIdShort: "Login ID must be at least 3 characters",
    authErrPasswordShort: "Password must be at least 6 characters",
    authErrNetwork: "Couldn't connect to the server…",
    authErrRequired: "Please enter your login ID and password",
    authErrDuplicateId: "That login ID is already taken. Try another one",
    authErrInvalidCredentials: "Login ID or password is incorrect",
    myEditName: "Edit name", mySave: "Save", mySaving: "Saving…", myCancel: "Cancel",
    myNameSaved: "Saved ✓", myNameSaveError: "Couldn't save, please try again",
    myGuestNameNote: "Guest names are fixed. Sign up with an ID and password to set your own name",
    myEditAvatar: "Change photo", myAvatarError: "Couldn't load that photo, please try another image",
    myGuestAvatarNote: "Guests can't set a photo either. Create an account to set a profile photo📷",
    authSubmitting: "Submitting…",
    authWelcomeBackBody: "Let's pick up where you left off.",
    authSuccessTitle: "Welcome to Magokoro!",
    authSuccessBody: "Let's find some souvenir stories.",
    authSuccessCta: "Get started", authLogout: "Log out",
    recoveryPresets: ["What was your first pet's name?", "What town were you born in?", "What's your favorite movie?", "What was your childhood nickname?", "Who was your favorite teacher?"],
    memberIdLabel: "Magokoro Member ID:",
    followingCountLabel: "Following",
    modalTitle: "🎁 Post a Gift Review",
    giftNameLabel: "Gift Name", giftNamePh: "e.g. 30-min shoulder massage coupon / Hokkaido Sweet Set",
    categoryLabel: "Category", sceneLabel: "Occasion", recipientLabel: "Recipient", priceLabel: "Price Range",
    recipientNameLabel: "Who did you give it to?", recipientNamePh: "e.g. A senior colleague who's helped me a lot",
    moodTagsLabel: "How were you feeling when you gave it? (optional, up to 2)",
    firstPostBadge: "First post", thanksHeartLabel: "Thank you",
    notifBellLabel: "Notifications", notifEmpty: "No notifications yet",
    notifCommentText: " left a comment", notifHeartText: " sent you a thank-you",
    notifHeartBatchText: "So much warmth is coming your way",
    postToastText: "Kokoron caught it!", nudgeText: "Want to see someone else's lovely post?",
  },
  ko: {
    appSub: "기념품·선물 리뷰", postBtn: "+ 리뷰 올리기", switchLabel: "日本語",
    heroTitle: '"그 선물, 정말 좋았어"', heroSub: "가 모이는 곳",
    heroDesc: "물건도, 경험도, 말 한마디도. 선물한 경험과 받은 마음을 나눠보세요.",
    toLabel: "받는 사람:", shareBtn: "↗ 공유", justNow: "방금", myName: "나", myAvatar: "나",
    font: "'Noto Sans KR', sans-serif",
    navHome: "홈", navSearch: "찾기", navPost: "올리기", navGift: "선물", navMe: "마이페이지",
    chatTitle: "코코론 AI 챗", chatSub: "대화를 기억하고, 모르는 건 인터넷에서 찾아봐요🌐",
    chatPlaceholder: "코코론에게 물어보기...",
    chatWelcome: "안녕! 나는 코코론이야🌱\n선물 추천은 물론, \"〇〇의 역사를 알려줘\" 같은 질문은 인터넷에서 찾아서 대답할게🌐\n(챗 답변은 아직 영어로만 가능해요. 한국어 대응 준비 중이에요🙏)",
    quickExamples: ["아사히카와 추천 기념품은?", "롯카테이 추천 상품은?", "신치토세 공항 기념품은?", "하코다테 기념품 알려줘"],
    chatNewBtn: "＋ 새 채팅", chatHistoryBtn: "🕘 기록", chatDefaultTitle: "새 채팅",
    chatThinking: "생각 중…", chatSearchingWeb: "🌐 인터넷에서 찾는 중…",
    swipeHint: "← 좌우 스와이프로 탭 이동이 된다 →",
    reviewReasonLabel: "💡 산 이유·고른 이유",
    reviewReasonPh: "예: 하코다테 여행 기념으로 현지의 맛을 선물하고 싶었어요",
    reviewReactionLabel: "😊 상대의 반응·나의 마음",
    reviewReactionPh: "예: 먹자마자 \"이거 맛있다!\"라고 전화가 왔어요",
    reviewNoteLabel: "✨ 감상·추천 포인트（어디서 샀는지도）",
    reviewNotePh: "예: 국물 맛이 깊어요. 하코다테역에서 구입, 포장도 예뻐서 선물하기 좋아요",
    reviewHeartLabel: "🕊️ 고를 때, 어떤 마음이었나요?（선택）",
    reviewHeartPh: "예: 기뻐하는 얼굴이 보고 싶었어요",
    reviewHeartHint: "\"기뻐해 주면 좋겠다\"라는 마음만으로도 충분한 마고코로(진심)입니다. 문득 떠오른 마음이 있다면 한마디 적어주세요.",
    cardReasonLabel: "산 이유", cardReactionLabel: "상대의 반응", cardNoteLabel: "감상·추천 포인트", cardHeartLabel: "담긴 마고코로",
    previewTitle: "🎁 코코론 체크 & 미리보기",
    previewEmpty: "위에 입력하면 여기에 미리보기가 표시되고, 코코론이 실시간으로 체크해요!",
    photoBtn: "📸 사진 찍기·고르기", photoSelected: "📸 사진을 설정했어요!（탭하면 변경）", samplePhotoBtn: "🎲 샘플 사진",
    checkPending: "리뷰를 쓰면 코코론이 자동으로 체크해요!",
    checkGateNote: "⚠️ 코코론 체크를 통과하면 올릴 수 있어요",
    giftNameRequired: "🎁 선물 이름을 입력하면 올릴 수 있어요",
    charUnit: "자", reviewTooLong: " — 조금 길어요, 살짝 줄여주세요 🙏",
    submitBtn: "올리기 🎁",
    postSearchPlaceholder: "게시물 검색（선물 이름·리뷰 내용）",
    noMatchTitle: "일치하는 게시물이 없습니다.", noMatchDesc: "키워드나 카테고리를 바꿔보세요.",
    dbTitle: "📦 기념품 데이터베이스", dbSearchPlaceholder: "기념품 이름·지역·태그로 검색", itemsUnit: "개",
    dbSearchNoMatch: "일치하는 기념품을 못 찾았어요…",
    otoriyoseNote: "직접 가지 못할 때도, 소중한 사람에게 바로 전할 수 있는 마음. 코코론이 주문을 도와줘요🎁",
    otoriyoseAd: "※가격·용량은 참고용입니다／이 링크로 구매하면 운영자에게 소개 수수료가 들어갈 수 있습니다",
    otoriyoseHeading: "마고코로를 전해요",
    searchRakuten: "라쿠텐에서 찾아보기", searchAmazon: "아마존에서 찾아보기",
    categories: ["전체", "먹거리", "인테리어", "체험·티켓", "플라워", "패션·액세서리", "뷰티", "잡화·전통공예", "말·마음", "행동·도움"],
    moodTagOptions: ["고마움을 전하고 싶어서", "수고했다는 마음으로", "축하하고 싶어서", "기운 냈으면 해서", "특별할 것 없는 날이지만", "문득 그리워져서"],
    scenes: ["생일", "이사 축하", "결혼기념일", "퇴직 축하", "출산 축하", "밸런타인", "화이트데이", "어머니의 날", "아버지의 날", "일상의 감사", "기타"],
    recipients: ["어머니", "아버지", "친구(여)", "친구(남)", "연인", "배우자", "형제·자매", "상사", "동료", "조부모", "부모님", "아이", "나 자신", "기타"],
    prices: ["프라이스리스", "〜¥1,000", "¥1,000〜3,000", "¥3,000〜5,000", "¥5,000〜10,000", "¥10,000〜"],
    nearbyBtn: "📍 근처 기념품 찾기", distanceUnit: "m 거리",
    nearbyFallbackNote: "현재 위치를 가져오지 못해서 아사히카와역 주변으로 표시해요!",
    locateBtn: "📍 현재 위치 사용", locating: "가져오는 중…", locationSetNote: "현재 위치를 설정했어요!",
    nearHere: "현재 위치 근처",
    feedAll: "전체", feedFollowing: "팔로잉",
    followBtn: "＋ 팔로우", followingBtn: "✓ 팔로잉",
    feedFollowingEmpty: "아직 아무도 팔로우하지 않았어요. 마음에 드는 사람의 「＋ 팔로우」를 눌러보세요!",
    commentsTitle: "댓글", commentPh: "댓글 쓰기…", commentSend: "보내기",
    replyBtn: "답글", replyPh: "답글 쓰기…", noComments: "아직 댓글이 없어요. 첫 댓글을 남겨보세요!",
    quoteBtn: "🔁 인용해서 올리기", thanksBtn: "💝 받은 후기",
    quotedLabel: "🔁 인용한 게시물", thanksLabel: "💝 이 선물을 받았어요",
    quoteModeTitle: "🔁 인용해서 올리기", thanksModeTitle: "💝 받은 후기 올리기",
    thanksReasonLabel: "💝 받았을 때의 상황", thanksReasonPh: "예: 생일에 딸에게 받았어요",
    thanksReactionLabel: "🥰 받은 마음", thanksReactionPh: "예: 놀라움과 기쁨에 저절로 웃음이 났어요",
    authTagline: "누군가를 생각하는 스위치, ON.", authSubtitle: "기념품·선물 리뷰를 나눠보세요",
    authKokoronWelcomeBack: "어서 와요!",
    authLineBtn: "LINE 로그인（준비 중）",
    authIdpassBtn: "계정 만들기",
    authAnonBtn: "가볍게 둘러보기（체험）",
    authGuideMsg: "계정을 만들 때도 이름·이메일·전화번호는 전혀 필요 없어요🌱 원하는 ID와 비밀번호만 정하면 끝!\n일단 구경만 하고 싶다면 「체험」으로 OK, 귀찮은 설정은 하나도 없어요✨\nLINE 로그인도 곧 사용할 수 있을 예정이에요🙏",
    authSwitchToLogin: "이미 계정이 있으신가요?", authSwitchToSignup: "처음이신가요?",
    authLoginLink: "로그인", authSignupLink: "회원가입",
    authPassword: "비밀번호", authLoginId: "로그인 ID", authLoginIdHint: "영문·숫자 3〜20자",
    authSubmitSignupId: "이대로 시작하기", authSubmitLoginId: "로그인하기",
    authRecoveryTitle: "비밀번호를 잊었을 때를 위한 질문（선택）",
    authRecoveryHint: "설정하지 않아도 가입할 수 있어요. 걱정되는 분만 본인 확인용으로 정해두세요",
    authRecoverySelectPh: "질문 선택", authRecoveryAnswer: "답",
    authErrLoginIdShort: "로그인 ID는 3자 이상 입력해주세요",
    authErrPasswordShort: "비밀번호는 6자 이상 입력해주세요",
    authErrNetwork: "서버에 연결하지 못했어요… 잠시 후 다시 시도해주세요",
    authErrRequired: "로그인 ID와 비밀번호를 입력해주세요",
    authErrDuplicateId: "그 로그인 ID는 이미 사용 중이에요. 다른 ID를 시도해주세요",
    authErrInvalidCredentials: "로그인 ID 또는 비밀번호가 올바르지 않아요",
    myEditName: "이름 변경", mySave: "저장", mySaving: "저장 중…", myCancel: "취소",
    myNameSaved: "변경했어요✓", myNameSaveError: "저장하지 못했어요, 다시 시도해주세요",
    myGuestNameNote: "게스트 이름은 고정이에요. 이름을 바꾸려면 ID와 비밀번호로 가입해주세요",
    myEditAvatar: "사진 변경", myAvatarError: "사진을 불러오지 못했어요, 다른 이미지로 시도해주세요",
    myGuestAvatarNote: "게스트는 사진도 설정할 수 없어요. 계정을 만들면 프로필 사진을 설정할 수 있어요📷",
    authSubmitting: "전송 중…",
    authWelcomeBackBody: "이어서 선물 이야기를 모아볼까요.",
    authSuccessTitle: "마고코로에 어서 오세요!",
    authSuccessBody: "바로 선물 이야기를 모으러 가자.",
    authSuccessCta: "시작하기", authLogout: "로그아웃",
    recoveryPresets: ["처음 키운 반려동물의 이름은?", "태어난 동네 이름은?", "좋아하는 영화 제목은?", "어릴 적 별명은?", "가장 좋아했던 선생님 이름은?"],
    memberIdLabel: "마고코로 회원 ID:",
    followingCountLabel: "팔로잉",
    modalTitle: "🎁 선물 리뷰 올리기",
    giftNameLabel: "선물 이름", giftNamePh: "예: 어깨 안마권 30분／홋카이도 스위츠 세트",
    categoryLabel: "카테고리", sceneLabel: "상황", recipientLabel: "받는 사람", priceLabel: "가격대",
    recipientNameLabel: "누구에게 선물했나요?", recipientNamePh: "예: 신세를 지고 있는 선배",
    moodTagsLabel: "어떤 마음으로 선물했나요? (선택, 최대 2개)",
    firstPostBadge: "처음이에요", thanksHeartLabel: "고마워요",
    notifBellLabel: "알림", notifEmpty: "아직 알림이 없어요",
    notifCommentText: "님이 댓글을 남겼어요", notifHeartText: "님이 «고마워요»를 보냈어요",
    notifHeartBatchText: "많은 따뜻함이 도착하고 있어요",
    postToastText: "코코론이 잘 받았어요!", nudgeText: "누군가의 멋진 게시물을 볼까요?",
  },
};

// ══════════════════════════════════════════════════
// 📦 タイムライン初期データ
// parts: {reason, reaction, note} 構造化レビュー
// commentList / postKind("normal"|"thanks"|"quote") / quoted 対応
// ══════════════════════════════════════════════════
const POSTS_JA = [
  { id: "1", userName: "Haruka_M", userAvatar: "H", avatarColor: "#C17B74", giftEmoji: "🍜", giftBg: "linear-gradient(135deg,#f8e8d4,#ffd9b3)", giftName: "函館塩ラーメンセット", recipient: "母", scene: "誕生日", category: "グルメ", price: "¥3,000〜5,000", likes: 42, liked: false, createdAt: "2日前",
    parts: { reason: "函館旅行のお土産に、地元の味を贈りたかった", reaction: "食べた瞬間に「これ美味しい！」と電話がきて、ちょっと泣きそうになりました", note: "毎年何を贈ろうか迷うのですが、今年は地元の味で攻めてみました。スープの深みが函館っぽくて、箱もきれいで渡しやすかったです。函館駅ビルで購入。" },
    photoUrl: makePhoto("🍜", "#FFE9D2", "#F2B279"), lat: 41.7687, lng: 140.7288, locationName: "函館駅", postKind: "normal", quoted: null,
    commentList: [
      { id: "c1", name: "kota.gifts", avatar: "K", color: "#6B8F71", text: "地元の味って一番喜ばれますよね！参考になります🍜", time: "1日前", replies: [{ id: "r1", name: "Haruka_M", avatar: "H", color: "#C17B74", text: "ですよね！来年はスープカレーにしようか迷ってます笑", time: "1日前" }] },
      { id: "c2", name: "miu_h", avatar: "M", color: "#C17B74", text: "うちの母も麺好きなので真似します〜", time: "6時間前", replies: [] },
    ] },
  { id: "2", userName: "keiko_m", userAvatar: "け", avatarColor: "#D08B5B", giftEmoji: "🍜", giftBg: "linear-gradient(135deg,#f8e8d4,#ffd9b3)", giftName: "函館塩ラーメンセット", recipient: "自分", scene: "誕生日", category: "グルメ", price: "¥3,000〜5,000", likes: 67, liked: false, createdAt: "1日前",
    parts: { reason: "誕生日に娘が函館旅行のお土産として贈ってくれました", reaction: "食べた瞬間、旅の話を聞きながら食べているみたいで、胸がいっぱいになりました", note: "娘が選んでくれたと思うと、いつものラーメンの何倍も美味しく感じます。ごちそうさまでした。" },
    photoUrl: null, lat: 43.0618, lng: 141.3545, locationName: "札幌市", postKind: "thanks",
    quoted: { userName: "Haruka_M", giftEmoji: "🍜", giftName: "函館塩ラーメンセット", snippet: "函館旅行のお土産に、地元の味を贈りたかった" },
    commentList: [{ id: "c1", name: "Haruka_M", avatar: "H", color: "#C17B74", text: "お母さん…！こちらこそ喜んでもらえて嬉しいです😭", time: "20時間前", replies: [] }] },
  { id: "3", userName: "yuto_k", userAvatar: "ゆ", avatarColor: "#6B8E9F", giftEmoji: "💆", giftBg: "linear-gradient(135deg,#e8f5ef,#c9e8d8)", giftName: "肩もみ券（30分×5枚つづり）", recipient: "父", scene: "父の日", category: "行動・お手伝い", price: "プライスレス", likes: 88, liked: false, createdAt: "3日前",
    parts: { reason: "父の日に何をあげても「いらないよ」と言うので、モノじゃないギフトにしてみました", reaction: "照れながら「じゃあ今日1枚使うか」と即使用。もみながらいろんな話ができました", note: "手作りの券なので0円ですが、会話の時間がついてくるのが最大のおまけです。画用紙とペンがあれば作れます。" },
    photoUrl: makePhoto("💆", "#E4F2EC", "#9CCBB4"), lat: 43.7706, lng: 142.3649, locationName: "旭川市", postKind: "normal", quoted: null, commentList: [] },
  { id: "4", userName: "sana.letter", userAvatar: "さ", avatarColor: "#B07EC8", giftEmoji: "💌", giftBg: "linear-gradient(135deg,#fdebf0,#f5c8d8)", giftName: "感謝の手紙（言葉のギフト）", recipient: "祖父母", scene: "日頃の感謝", category: "言葉・きもち", price: "プライスレス", likes: 104, liked: false, createdAt: "4日前",
    parts: { reason: "遠方でなかなか会えない祖父母に、電話では照れて言えない感謝を伝えたかった", reaction: "後日「額に入れて飾ったよ」と写真が届きました。電話口の声が震えていました", note: "便箋1枚から始められる、いちばん身近なギフトだと思います。書き出しは「いつもありがとう」だけで十分でした。" },
    photoUrl: makePhoto("💌", "#FDEBF0", "#F0A8B8"), lat: 43.0618, lng: 141.3545, locationName: "札幌市", postKind: "normal", quoted: null,
    commentList: [{ id: "c1", name: "aina.ainu", avatar: "A", color: "#9B7EC8", text: "言葉のギフト、素敵すぎます。私も書こうかな…", time: "2日前", replies: [] }] },
  { id: "5", userName: "aina.ainu", userAvatar: "A", avatarColor: "#9B7EC8", giftEmoji: "🪶", giftBg: "linear-gradient(135deg,#f3edf8,#e0d0f0)", giftName: "アイヌ文様の刺繍ピアス", recipient: "友人（女性）", scene: "その他", category: "ファッション・アクセサリー", price: "¥3,000〜5,000", likes: 23, liked: false, createdAt: "5日前",
    parts: { reason: "お菓子だけじゃなく、身につけられるお土産を探していました", reaction: "「旅の話を聞きながら着けられるのがいい」と、その場で着けてくれました", note: "旭川の作家さんの一点もの。旭川クラフト市で購入できます。" },
    photoUrl: null, lat: 43.7706, lng: 142.3649, locationName: "旭川市", postKind: "normal", quoted: null, commentList: [] },
  { id: "6", userName: "ryo_wood", userAvatar: "R", avatarColor: "#7B8FA1", giftEmoji: "🦉", giftBg: "linear-gradient(135deg,#eef2f5,#dbe4ec)", giftName: "木彫りの梟（ふくろう）小物", recipient: "祖父母", scene: "その他", category: "雑貨・伝統工芸", price: "¥3,000〜5,000", likes: 19, liked: false, createdAt: "1日前",
    parts: { reason: "縁起物で、置くだけで場が和むものを探していました", reaction: "玄関に飾ってくれて「縁起がいいね」と喜んでもらえました", note: "北海道の木彫り工芸品。新千歳空港の売店で購入。日持ちを気にしなくていいのも楽です。" },
    photoUrl: makePhoto("🦉", "#EDF2F6", "#AFC3D4"), lat: 42.7752, lng: 141.6923, locationName: "新千歳空港", postKind: "normal", quoted: null, commentList: [] },
];

const POSTS_EN = [
  { id: "1", userName: "Emma_R", userAvatar: "E", avatarColor: "#C17B74", giftEmoji: "🍫", giftBg: "linear-gradient(135deg,#f8e8d4,#ffd9b3)", giftName: "Artisan Chocolate Box", recipient: "Mother", scene: "Birthday", category: "Food & Drink", price: "¥3,000–5,000", likes: 38, liked: false, createdAt: "2 days ago",
    parts: { reason: "Wanted something handmade from a small Kyoto chocolatier", reaction: "She called me twice to say thank you — completely floored", note: "Bought at Kyoto Station. The wrapping alone is gift-worthy." },
    photoUrl: makePhoto("🍫", "#F3E2D0", "#C89F7B"), lat: 35.0116, lng: 135.7681, locationName: "Kyoto", postKind: "normal", quoted: null,
    commentList: [{ id: "c1", name: "james.g", avatar: "J", color: "#6B8F71", text: "Kyoto chocolatiers are so underrated!", time: "1 day ago", replies: [] }] },
  { id: "2", userName: "rose.m", userAvatar: "R", avatarColor: "#D08B5B", giftEmoji: "🍫", giftBg: "linear-gradient(135deg,#f8e8d4,#ffd9b3)", giftName: "Artisan Chocolate Box", recipient: "Myself", scene: "Birthday", category: "Food & Drink", price: "¥3,000–5,000", likes: 52, liked: false, createdAt: "1 day ago",
    parts: { reason: "My daughter gave this to me for my birthday", reaction: "Surprised and so happy — I couldn't stop smiling all afternoon", note: "Knowing she picked it herself makes every piece taste better." },
    photoUrl: null, lat: 43.06, lng: 141.35, locationName: "Sapporo", postKind: "thanks",
    quoted: { userName: "Emma_R", giftEmoji: "🍫", giftName: "Artisan Chocolate Box", snippet: "Wanted something handmade from a small Kyoto chocolatier" },
    commentList: [] },
  { id: "3", userName: "leo_k", userAvatar: "L", avatarColor: "#6B8E9F", giftEmoji: "💆", giftBg: "linear-gradient(135deg,#e8f5ef,#c9e8d8)", giftName: "Shoulder Massage Coupons (5x)", recipient: "Father", scene: "Father's Day", category: "Acts of Service", price: "Priceless", likes: 73, liked: false, createdAt: "3 days ago",
    parts: { reason: "Dad says 'I don't need anything' every year, so I gave time instead of things", reaction: "He used one immediately, grinning — and we talked the whole time", note: "Costs nothing but paper and a pen. The conversation is the real gift." },
    photoUrl: makePhoto("💆", "#E4F2EC", "#9CCBB4"), lat: 43.77, lng: 142.36, locationName: "Asahikawa", postKind: "normal", quoted: null, commentList: [] },
  { id: "4", userName: "sana.letter", userAvatar: "S", avatarColor: "#B07EC8", giftEmoji: "💌", giftBg: "linear-gradient(135deg,#fdebf0,#f5c8d8)", giftName: "A Thank-You Letter", recipient: "Grandparents", scene: "Everyday Thanks", category: "Words & Feelings", price: "Priceless", likes: 96, liked: false, createdAt: "4 days ago",
    parts: { reason: "Wanted to say what I can never say on the phone", reaction: "They framed it. Grandma's voice was shaking when she called", note: "One sheet of paper is enough. I started with just 'thank you for everything'." },
    photoUrl: makePhoto("💌", "#FDEBF0", "#F0A8B8"), lat: 43.06, lng: 141.35, locationName: "Sapporo", postKind: "normal", quoted: null, commentList: [] },
];

// ══════════════════════════════════════════════════
// 💾 お土産DB（aliases＝別名・略称での確実な特定用）
// ══════════════════════════════════════════════════
// 📦 購入リンクのスキーマ（各アイテムで任意設定・省略時は自動で検索URLになる）
//   rakutenUrl / amazonUrl : 未設定(省略)なら検索URLを自動生成、明示的にnullを入れるとそのリンクだけ非表示にできる
//                            （転売業者しか出品がない商品など）。文字列を入れれば直リンクとして使われる
//   sellerType             : "official"（メーカー公式）/ "authorized"（正規取扱店）/ "other"（未確認・デフォルト）
//                            後から「公式のみ表示」の絞り込みに使う想定。現状は全件未調査のため省略＝otherで運用
const SOUVENIR_DB = [
  { id: "s1", region: "旭川", name: "六花亭 マルセイバターサンド", contents: "10個入り ¥1,350・20個入り ¥2,700", aliases: ["マルセイバターサンド", "バターサンド", "マルセイ", "六花亭"], category: "グルメ", tags: ["甘い物", "定番", "バター", "サンドクッキー", "レーズン"], emoji: "🧈", price: "¥1,000〜3,000", shop: "六花亭 旭川店", airports: ["新千歳空港", "旭川空港"],kcalNote: "1個 約168kcal（目安）", stations: ["旭川駅", "札幌駅"], lat: 43.7651, lng: 142.3551 },
  { id: "s2", region: "旭川", name: "ロバ菓子司 蔵生（くらなま）", contents: "6枚入り ¥730", aliases: ["蔵生", "くらなま", "kuranama"], category: "グルメ",
    tags: ["生チョコ", "クッキー", "生チョコクッキー", "サクサク", "しっとり", "旭川クッキー", "チョコレート", "焼き菓子", "保存料不使用", "北海道産小麦", "ビートグラニュー糖"],
    emoji: "🍪", price: "〜¥1,000", shop: "The Sun 蔵人 本店", airports: ["旭川空港"],stations: ["旭川駅"], lat: 43.7542, lng: 142.3812 },
  { id: "s3", region: "旭川", name: "あさひかわ牧場 特製プリン", aliases: ["特製プリン"], category: "グルメ", tags: ["とろける", "スイーツ", "プリン"], emoji: "🍮", price: "〜¥1,000", shop: "旭川駅お土産売店",stations: ["旭川駅"], lat: 43.7628, lng: 142.3584 },
  { id: "s4", region: "札幌", name: "石屋製菓 白い恋人", contents: "18枚入り ¥1,296・36枚入り ¥2,376", aliases: ["白い恋人", "しろいこいびと", "shiroi koibito"], category: "グルメ", tags: ["大定番", "サクサク", "ラングドシャ", "ホワイトチョコ"], emoji: "🍪", price: "¥1,000〜3,000", shop: "白い恋人パーク", airports: ["新千歳空港"],kcalNote: "1枚 約57kcal（目安）", stations: ["札幌駅"], lat: 43.0883, lng: 141.2711 },
  { id: "s4b", region: "札幌", name: "サッポロビール園 特製のたれ", aliases: ["特製のたれ", "ジンギスカンのたれ", "ジンギスカン", "サッポロビール"], category: "グルメ", tags: ["名物", "調味料", "お土産定番"], emoji: "🧴", price: "〜¥1,000", shop: "サッポロビール園", lat: 43.0724, lng: 141.393 },
  { id: "s5", region: "函館", name: "スナッフルス チーズオムレット", contents: "6個入り ¥1,188", aliases: ["チーズオムレット", "スナッフルス"], category: "グルメ", tags: ["ふわふわ", "濃厚", "チーズ", "スフレ"], emoji: "🧀", price: "¥1,000〜3,000", shop: "函館駅前店", airports: ["函館空港", "新千歳空港"],stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s6", region: "釧路", name: "阿寒湖 まりも羊羹", aliases: ["まりも羊羹"], category: "グルメ", tags: ["定番", "阿寒湖", "和菓子", "羊羹"], emoji: "🍡", price: "〜¥1,000", shop: "阿寒湖温泉街 土産店", lat: 43.4306, lng: 144.0956 },
  { id: "s7", region: "釧路", name: "マリモガラスのペンダント", aliases: ["マリモペンダント"], category: "ファッション・アクセサリー", tags: ["ペンダント", "マリモ", "ガラス", "アクセサリー"], emoji: "💚", price: "¥1,000〜3,000", shop: "阿寒湖アイヌコタン", lat: 43.4322, lng: 144.0871 },
  { id: "s8", region: "釧路", name: "アイヌ文様 木彫りペンダント", aliases: ["木彫りペンダント"], category: "ファッション・アクセサリー", tags: ["ペンダント", "木彫り", "アイヌ文様", "アクセサリー"], emoji: "🪵", price: "¥3,000〜5,000", shop: "阿寒湖アイヌコタン 工芸店", lat: 43.4322, lng: 144.0871 },
  { id: "s9", region: "北見", name: "北見ハッカ飴", aliases: ["ハッカ飴"], category: "グルメ", tags: ["ヘルシー", "さっぱり", "飴", "ダイエット", "低カロリー", "ミント"], emoji: "🍬", price: "〜¥1,000", shop: "北見ハッカ記念館 売店",airports: ["新千歳空港"], lat: 43.8029, lng: 143.8946 },
  { id: "s10", region: "函館", name: "がごめ昆布スナック", aliases: ["がごめ昆布", "昆布スナック"], category: "グルメ", tags: ["ヘルシー", "昆布", "おつまみ", "ダイエット", "低カロリー", "ミネラル"], emoji: "🌿", price: "〜¥1,000", shop: "函館朝市",airports: ["新千歳空港"], stations: ["函館駅"], lat: 41.7717, lng: 140.7256 },
  { id: "s11", region: "小樽", name: "ルタオ ドゥーブルフロマージュ", contents: "1ホール（5号）¥2,052", aliases: ["ルタオ", "ドゥーブルフロマージュ", "letao"], category: "グルメ", tags: ["チーズケーキ", "濃厚", "小樽土産", "冷凍配送"], emoji: "🍰", price: "¥1,000〜3,000", shop: "小樽洋菓子舗ルタオ 本店", airports: ["新千歳空港"],stations: ["小樽駅"], lat: 43.1907, lng: 140.9947 },
  { id: "s12", region: "小樽", name: "小樽ガラスの一輪挿し", aliases: ["小樽ガラス"], category: "インテリア", tags: ["ガラス細工", "手作り", "小樽運河"], emoji: "🏺", price: "¥3,000〜5,000", shop: "北一硝子 三号館", lat: 43.1926, lng: 140.9963 },
  { id: "s12b", region: "小樽", name: "小樽オルゴール堂のオルゴール", aliases: ["オルゴール", "おるごーる", "orgel", "music box", "オルゴール堂"], category: "雑貨・伝統工芸", tags: ["オルゴール", "小樽名物", "記念品", "一生もの"], emoji: "🎶", price: "¥3,000〜5,000", shop: "小樽オルゴール堂 本館", stations: ["小樽駅"], lat: 43.1890, lng: 141.0005 },
  { id: "s13", region: "帯広", name: "柳月 三方六", contents: "1本 ¥972・ハーフ ¥540", aliases: ["三方六", "柳月"], category: "グルメ", tags: ["バウムクーヘン", "十勝", "定番", "白樺"], emoji: "🍫", price: "¥1,000〜3,000", shop: "柳月 帯広本店", airports: ["新千歳空港"],stations: ["帯広駅"], lat: 42.9153, lng: 143.1958 },
  { id: "s14", region: "帯広", name: "十勝ハーブ牛の豚丼だれ", aliases: ["豚丼だれ", "十勝豚丼"], category: "グルメ", tags: ["十勝名物", "調味料"], emoji: "🍖", price: "〜¥1,000", shop: "帯広駅とかちプラザ",stations: ["帯広駅"], lat: 42.9239, lng: 143.1956 },
  { id: "s15", region: "富良野", name: "富良野チーズ工房 手作りチーズ", aliases: ["富良野チーズ"], category: "グルメ", tags: ["チーズ", "手作り", "富良野"], emoji: "🧀", price: "¥1,000〜3,000", shop: "富良野チーズ工房", lat: 43.2999, lng: 142.4067 },
  { id: "s16", region: "富良野", name: "ラベンダー香油・ポプリ", aliases: ["ラベンダーグッズ", "ラベンダー"], category: "美容", tags: ["ラベンダー", "香り", "富良野土産"], emoji: "💜", price: "〜¥1,000", shop: "ファーム富田", lat: 43.4436, lng: 142.4653 },
  { id: "s17", region: "根室", name: "花咲ガニの缶詰", aliases: ["花咲ガニ"], category: "グルメ", tags: ["カニ", "海鮮", "根室名物", "缶詰"], emoji: "🦀", price: "¥3,000〜5,000", shop: "根室海鮮市場", lat: 43.3303, lng: 145.5828 },
  { id: "s18", region: "稚内", name: "利尻昆布", aliases: ["利尻昆布", "稚内昆布"], category: "グルメ", tags: ["昆布", "だし", "ヘルシー", "稚内名物"], emoji: "🌊", price: "¥1,000〜3,000", shop: "稚内駅お土産処", lat: 45.4152, lng: 141.6733 },
  { id: "s19", region: "網走", name: "網走監獄カレー（レトルト）", aliases: ["監獄カレー", "網走カレー"], category: "グルメ", tags: ["カレー", "レトルト", "ご当地", "話題性"], emoji: "🍛", price: "〜¥1,000", shop: "博物館網走監獄 売店", lat: 43.9738, lng: 144.2547 },
  { id: "s20", region: "苫小牧", name: "ほっき貝の炊き込みご飯の素", aliases: ["ほっき貝", "ホッキ貝"], category: "グルメ", tags: ["ほっき貝", "海鮮", "苫小牧名物"], emoji: "🐚", price: "〜¥1,000", shop: "苫小牧駅前物産館", lat: 42.6337, lng: 141.6053 },
  { id: "s21", region: "室蘭", name: "室蘭やきとり（豚串）セット", aliases: ["室蘭やきとり", "室蘭焼き鳥"], category: "グルメ", tags: ["やきとり", "豚串", "室蘭名物"], emoji: "🍢", price: "¥1,000〜3,000", shop: "室蘭やきとり一条会", lat: 42.3153, lng: 140.9737 },
  { id: "s22", region: "登別", name: "登別温泉まんじゅう", aliases: ["温泉まんじゅう", "登別まんじゅう"], category: "グルメ", tags: ["温泉まんじゅう", "和菓子", "登別名物"], emoji: "♨️", price: "〜¥1,000", shop: "登別温泉街 売店", lat: 42.4939, lng: 141.1447 },
  { id: "s23", region: "知床", name: "羅臼昆布とろろ", aliases: ["羅臼昆布"], category: "グルメ", tags: ["昆布", "だし", "知床名物", "ヘルシー"], emoji: "🌿", price: "¥1,000〜3,000", shop: "道の駅 知床・らうす", lat: 44.0387, lng: 145.1197 },
  { id: "s24", region: "千歳", name: "新千歳空港限定 白いプリン", aliases: ["空港限定プリン", "新千歳プリン"], category: "グルメ", tags: ["空港限定", "プリン", "帰り土産"], emoji: "🍮", price: "〜¥1,000", shop: "新千歳空港 お土産処",airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s25", region: "洞爺湖", name: "洞爺湖まんじゅう（温泉たまご風味）", aliases: ["洞爺湖まんじゅう"], category: "グルメ", tags: ["温泉まんじゅう", "洞爺湖名物", "和菓子"], emoji: "♨️", price: "〜¥1,000", shop: "洞爺湖温泉街 売店", lat: 42.6073, lng: 140.8397 },
  { id: "s26", region: "札幌", name: "ロイズ 生チョコレート（オーレ）", contents: "20粒入り ¥756", aliases: ["ロイズ", "royce", "生チョコ", "生チョコレート"], category: "グルメ", tags: ["生チョコ", "濃厚", "札幌定番", "要冷蔵", "ギフト"], emoji: "🍫", price: "¥1,000〜3,000", shop: "ロイズ 新千歳空港店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0697, lng: 141.3517 },
  { id: "s27", region: "札幌", name: "ロイズ ポテトチップチョコレート", contents: "190g ¥756", aliases: ["ポテチチョコ", "ロイズポテチ", "royce potato"], category: "グルメ", tags: ["ポテチ", "チョコ", "話題性", "お土産定番", "常温保存"], emoji: "🍫", price: "¥1,000〜3,000", shop: "ロイズ 新千歳空港店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0697, lng: 141.3517 },
  { id: "s28", region: "砂川", name: "北菓楼 北海道開拓おかき", contents: "帆立10本入り ¥1,080〜", aliases: ["開拓おかき", "北菓楼", "きたかろう", "kitakaro"], category: "グルメ", tags: ["おかき", "海産物", "帆立", "昆布", "えび", "おつまみ", "北海道素材"], emoji: "🍘", price: "¥1,000〜3,000", shop: "北菓楼 砂川本店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.5203, lng: 141.9048 },
  { id: "s29", region: "札幌", name: "きのとや 札幌農学校ミルククッキー", contents: "16枚入り ¥1,080", aliases: ["札幌農学校", "きのとや", "ミルククッキー", "kinotoya"], category: "グルメ", tags: ["クッキー", "ミルク", "北海道牛乳", "サクサク", "定番"], emoji: "🍪", price: "¥1,000〜3,000", shop: "きのとや 大丸札幌店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0657, lng: 141.3507 },
  { id: "s30", region: "北海道", name: "じゃがポックル", contents: "10袋入り ¥972", aliases: ["じゃがポックル", "ポテトファーム", "jagapokkuru", "jagapokkle"], category: "グルメ", tags: ["スナック", "じゃがいも", "北海道限定", "オホーツク塩", "軽い"], emoji: "🥔", kcalNote: "1袋(18g) 約105kcal（目安）", price: "〜¥1,000", shop: "新千歳空港・道内各所", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 42.7752, lng: 141.6923 },
  { id: "s31", region: "苫小牧", name: "もりもと ハスカップジュエリー", contents: "10個入り ¥1,080", aliases: ["ハスカップジュエリー", "もりもと", "morimoto", "ハスカップ"], category: "グルメ", tags: ["ハスカップ", "洋菓子", "北海道限定", "甘酸っぱい", "チョコ"], emoji: "💜", price: "¥1,000〜3,000", shop: "もりもと 苫小牧本店", airports: ["新千歳空港"], lat: 42.6331, lng: 141.6083 },
  { id: "s32", region: "洞爺湖", name: "わかさいも本舗 わかさいも", aliases: ["わかさいも", "wakasaimo"], category: "グルメ", tags: ["和菓子", "芋餡", "洞爺湖名物", "素朴"], emoji: "🍠", price: "〜¥1,000", shop: "わかさいも本舗 洞爺湖店", lat: 42.5683, lng: 140.7942 },
  { id: "s33", region: "北海道", name: "ホリ とうきびチョコ", aliases: ["とうきびチョコ", "ホリ", "とうもろこしチョコ", "hori"], category: "グルメ", tags: ["とうもろこし", "チョコ", "北海道限定", "ユニーク"], emoji: "🌽", price: "〜¥1,000", shop: "新千歳空港・道内各所", airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s34", region: "帯広", name: "六花亭 ストロベリーチョコ（ホワイト）", contents: "80g ¥540", aliases: ["ストロベリーチョコ", "いちごチョコ", "苺チョコ"], category: "グルメ", tags: ["いちご", "ホワイトチョコ", "フリーズドライ", "サクサク", "六花亭"], emoji: "🍓", price: "〜¥1,000", shop: "六花亭 各店舗", airports: ["新千歳空港"], stations: ["札幌駅", "帯広駅"], lat: 42.9153, lng: 143.1958 },
  { id: "s35", region: "帯広", name: "六花亭 霜だたみ", aliases: ["霜だたみ", "しもだたみ"], category: "グルメ", tags: ["チョコパイ", "モカ", "サクサク", "六花亭", "帯広"], emoji: "❄️", price: "〜¥1,000", shop: "六花亭 各店舗", airports: ["新千歳空港"], stations: ["帯広駅"], lat: 42.9153, lng: 143.1958 },
  { id: "s36", region: "帯広", name: "六花亭 大平原", aliases: ["大平原", "おおへいげん"], category: "グルメ", tags: ["マドレーヌ", "バター", "しっとり", "六花亭", "帯広"], emoji: "🧈", price: "〜¥1,000", shop: "六花亭 各店舗", stations: ["帯広駅"], lat: 42.9153, lng: 143.1958 },
  { id: "s37", region: "帯広", name: "六花亭 六花のつゆ", aliases: ["六花のつゆ", "ろっかのつゆ", "ボンボン"], category: "グルメ", tags: ["ボンボン菓子", "お酒", "缶入り", "六花亭", "かわいい"], emoji: "🫙", price: "〜¥1,000", shop: "六花亭 各店舗", airports: ["新千歳空港"], stations: ["帯広駅"], lat: 42.9153, lng: 143.1958 },
  { id: "s38", region: "札幌", name: "壺屋 き花", contents: "8枚入り ¥756", aliases: ["き花", "きばな", "壺屋"], category: "グルメ", tags: ["フロランタン", "アーモンド", "サクサク", "定番", "札幌"], emoji: "🌸", price: "〜¥1,000", shop: "壺屋 新千歳空港店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0657, lng: 141.3507 },
  { id: "s39", region: "札幌", name: "YOSHIMI かまえびせんべい おかきっ娘", aliases: ["おかきっ娘", "YOSHIMI", "よしみ", "えびせんべい"], category: "グルメ", tags: ["えびせんべい", "サクサク", "軽い", "おつまみ", "札幌"], emoji: "🦐", price: "〜¥1,000", shop: "YOSHIMI 新千歳空港店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0657, lng: 141.3507 },
  { id: "s40", region: "中札内", name: "花畑牧場 生キャラメル", aliases: ["生キャラメル", "花畑牧場", "はなばたけぼくじょう"], category: "グルメ", tags: ["生キャラメル", "北海道牛乳", "濃厚", "話題", "要冷蔵"], emoji: "🍬", price: "¥1,000〜3,000", shop: "花畑牧場 直売店・新千歳空港", airports: ["新千歳空港"], lat: 42.7127, lng: 143.0939 },
  { id: "s41", region: "札幌", name: "SNOW CHEESE スノーチーズ（生食感チーズ菓子）", aliases: ["スノーチーズ", "snow cheese", "チーズ菓子"], category: "グルメ", tags: ["チーズ", "生食感", "新千歳限定", "洋菓子", "濃厚"], emoji: "🧀", price: "¥1,000〜3,000", shop: "新千歳空港 JAL PLAZA", airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s42", region: "十勝", name: "十勝チーズ（チーズ工房NEEDS）", aliases: ["十勝チーズ", "NEEDS", "ニーズ", "チーズセット"], category: "グルメ", tags: ["チーズ", "十勝", "本格派", "おつまみ", "ギフト"], emoji: "🧀", price: "¥3,000〜5,000", shop: "チーズ工房NEEDS 直売所", lat: 43.0667, lng: 143.4167 },
  { id: "s43", region: "北海道", name: "ほがじゃ 北海道ポテトスナック", aliases: ["ほがじゃ", "hogaja"], category: "グルメ", tags: ["じゃがいも", "スナック", "北海道限定", "サクサク", "おつまみ"], emoji: "🥔", price: "〜¥1,000", shop: "新千歳空港・道内各所", airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s44", region: "北海道", name: "シマエナガ ぬいぐるみ・グッズ", aliases: ["シマエナガ", "しまえなが", "雪の妖精", "shimaenaga"], category: "雑貨・伝統工芸", tags: ["シマエナガ", "かわいい", "北海道限定", "ぬいぐるみ", "雑貨"], emoji: "🐦", price: "〜¥3,000", shop: "新千歳空港・札幌駅お土産処", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 42.7752, lng: 141.6923 },
  { id: "s45", region: "釧路", name: "シマエナガまんじゅう（阿寒菓子処 松屋）", aliases: ["シマエナガまんじゅう", "しまえなが饅頭"], category: "グルメ", tags: ["シマエナガ", "まんじゅう", "白あん", "かわいい", "手作り"], emoji: "🐦", price: "〜¥1,000", shop: "阿寒菓子処 松屋", lat: 43.4306, lng: 144.0956 },
  { id: "s46", region: "函館", name: "ハセガワストア やきとり弁当", aliases: ["やきとり弁当", "ハセスト", "hasesuto", "ハセガワ"], category: "グルメ", tags: ["函館名物", "豚串", "B級グルメ", "ソウルフード", "焼きたて"], emoji: "🍱", price: "〜¥1,000", shop: "ハセガワストア ベイエリア店", stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s47", region: "函館", name: "トラピスチヌ 修道院クッキー・バター飴", aliases: ["トラピスチヌ", "修道院クッキー", "バター飴", "函館修道院"], category: "グルメ", tags: ["修道院", "クッキー", "バター飴", "函館限定", "手作り"], emoji: "⛪", price: "〜¥1,000", shop: "トラピスチヌ修道院 売店", lat: 41.7467, lng: 140.7786 },
  { id: "s48", region: "北海道", name: "セイコーマート ホットシェフおにぎり", aliases: ["セイコーマート", "セコマ", "ホットシェフ", "seicomart"], category: "グルメ", tags: ["コンビニ", "北海道限定", "ホットシェフ", "地元民定番"], emoji: "🍙", price: "〜¥1,000", shop: "セイコーマート 道内各所", lat: 43.0697, lng: 141.3517 },
  { id: "s49", region: "札幌", name: "千秋庵 山親爺", aliases: ["山親爺", "やまおやじ", "千秋庵", "senshuan"], category: "グルメ", tags: ["洋風煎餅", "バター", "ミルク", "ロングセラー", "札幌定番"], emoji: "🐻", price: "〜¥1,000", shop: "千秋庵 札幌本店", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0657, lng: 141.3507 },
  { id: "s50", region: "札幌", name: "北海道バターのいとこ（あんバター）", contents: "10個入り ¥1,188", aliases: ["バターのいとこ", "あんバター", "butter no itoko"], category: "グルメ", tags: ["あんバター", "スキムミルク", "北海道限定", "酪農家支援", "話題"], emoji: "🧈", price: "¥1,000〜3,000", shop: "大丸札幌店・新千歳空港", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0627, lng: 141.3547 },
  { id: "s51", region: "函館", name: "函館塩ラーメンセット（お土産用）", aliases: ["函館塩ラーメン", "塩ラーメン", "はこだてラーメン"], category: "グルメ", tags: ["ラーメン", "函館名物", "塩スープ", "お土産定番"], emoji: "🍜", price: "〜¥1,000", shop: "函館駅お土産処・朝市", stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s52", region: "函館", name: "はこだて柳屋 いかようかん", aliases: ["いかようかん", "いか羊羹", "柳屋"], category: "グルメ", tags: ["ユニーク", "話題性", "イカ型", "ようかん", "函館限定", "映え"], emoji: "🦑", price: "〜¥1,000", shop: "はこだて柳屋 本店", lat: 41.7731, lng: 140.7264 },
  { id: "s53", region: "函館", name: "五勝手屋羊羹", aliases: ["五勝手屋", "ごかってや", "筒入り羊羹"], category: "グルメ", tags: ["羊羹", "筒入り", "金時豆", "函館定番", "和菓子"], emoji: "🍡", price: "〜¥1,000", shop: "五勝手屋本舗 函館店", stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s54", region: "千歳", name: "びえいのコーンぱん（新千歳空港限定）", aliases: ["コーンぱん", "びえいのコーンパン", "biei corn bread"], category: "グルメ", tags: ["パン", "とうもろこし", "空港限定", "焼きたて", "行列"], emoji: "🌽", price: "〜¥1,000", shop: "新千歳空港 びえい 富良野 shop", airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s55", region: "旭川", name: "旭川醤油ラーメンセット（お土産用）", aliases: ["旭川ラーメン", "旭川醤油ラーメン", "asahikawa ramen"], category: "グルメ", tags: ["ラーメン", "醤油", "旭川名物", "お土産定番"], emoji: "🍜", price: "〜¥1,000", shop: "旭川駅お土産処", stations: ["旭川駅"], lat: 43.7628, lng: 142.3584 },
  { id: "s56", region: "札幌", name: "札幌スープカレー（レトルト）", aliases: ["スープカレー", "soup curry", "札幌カレー"], category: "グルメ", tags: ["スープカレー", "札幌名物", "レトルト", "スパイス"], emoji: "🍛", price: "〜¥1,000", shop: "新千歳空港・札幌駅お土産処", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0657, lng: 141.3507 },
  { id: "s57", region: "函館", name: "函館イカの塩辛", aliases: ["イカの塩辛", "いか塩辛", "函館イカ"], category: "グルメ", tags: ["イカ", "海鮮", "塩辛", "おつまみ", "函館名物"], emoji: "🦑", price: "¥1,000〜3,000", shop: "函館朝市", stations: ["函館駅"], lat: 41.7717, lng: 140.7256 },
  { id: "s58", region: "網走", name: "毛ガニ缶詰（オホーツク産）", aliases: ["毛ガニ", "オホーツクカニ", "かに缶"], category: "グルメ", tags: ["カニ", "海鮮", "缶詰", "プレミアム", "ギフト"], emoji: "🦀", price: "¥3,000〜5,000", shop: "網走観光交流センター", lat: 43.9738, lng: 144.2547 },
  { id: "s59", region: "稚内", name: "礼文・利尻産ウニ（塩水パック）", aliases: ["ウニ", "雲丹", "礼文ウニ", "利尻ウニ", "生ウニ"], category: "グルメ", tags: ["ウニ", "高級", "海鮮", "要冷蔵", "ギフト", "濃厚"], emoji: "🌊", price: "¥5,000以上", shop: "礼文・利尻島 漁協直売所", lat: 45.1833, lng: 141.2333 },
  { id: "s60", region: "苫小牧", name: "猿払産ホタテ干し貝柱", aliases: ["ホタテ貝柱", "干しほたて", "猿払ホタテ"], category: "グルメ", tags: ["ホタテ", "干物", "海鮮", "おつまみ", "ギフト", "北海道産"], emoji: "🐚", price: "¥3,000〜5,000", shop: "新千歳空港 海産物コーナー", airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s61", region: "釧路", name: "白糠酪恵舎 モッツァレラチーズ", aliases: ["白糠酪恵舎", "酪恵舎", "モッツァレラ", "しらぬか"], category: "グルメ", tags: ["チーズ", "本格派", "イタリアン", "白糠", "おつまみ", "要冷蔵"], emoji: "🧀", price: "¥1,000〜3,000", shop: "白糠酪恵舎 直売所", lat: 43.5328, lng: 144.0644 },
  { id: "s62", region: "余市", name: "ニッカウヰスキー シングルモルト余市", aliases: ["ニッカ", "シングルモルト余市", "余市ウイスキー", "nikka"], category: "グルメ", tags: ["ウイスキー", "余市", "高級", "世界的評価", "ギフト", "お酒"], emoji: "🥃", price: "¥5,000以上", shop: "ニッカウヰスキー余市蒸溜所", lat: 43.1853, lng: 140.7885 },
  { id: "s63", region: "小樽", name: "おたるワイン（北海道ワイン）", aliases: ["おたるワイン", "小樽ワイン", "北海道ワイン"], category: "グルメ", tags: ["ワイン", "小樽", "国産ワイン", "甘口", "お酒", "ギフト"], emoji: "🍷", price: "¥1,000〜3,000", shop: "北海道ワイン 小樽醸造所", stations: ["小樽駅"], lat: 43.1907, lng: 140.9947 },
  { id: "s64", region: "函館", name: "ラッキーガラナ（ラッキーピエロ）", aliases: ["ラッキーガラナ", "ガラナ", "lucky garana", "ラッキーピエロ"], category: "グルメ", tags: ["炭酸飲料", "ガラナ", "函館限定", "ソウルドリンク", "話題"], emoji: "🥤", price: "〜¥1,000", shop: "ラッキーピエロ 各店舗", stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s65", region: "北海道", name: "サッポロクラシック（北海道限定ビール）", aliases: ["サッポロクラシック", "クラシック", "sapporo classic"], category: "グルメ", tags: ["ビール", "北海道限定", "サッポロ", "お酒", "ギフト"], emoji: "🍺", price: "〜¥1,000", shop: "道内コンビニ・スーパー", airports: ["新千歳空港"], lat: 43.0697, lng: 141.3517 },
  { id: "s66", region: "夕張", name: "夕張メロン", aliases: ["夕張メロン", "ゆうばりメロン", "yubari melon"], category: "グルメ", tags: ["メロン", "高級フルーツ", "夕張", "ブランド", "ギフト", "夏季限定"], emoji: "🍈", price: "¥5,000以上", shop: "夕張市農協・新千歳空港", airports: ["新千歳空港"], lat: 42.9931, lng: 141.9772 },
  { id: "s67", region: "夕張", name: "ホリ 夕張メロンピュアゼリー", contents: "6個入り ¥1,080", aliases: ["夕張メロンゼリー", "ピュアゼリー", "メロンゼリー"], category: "グルメ", tags: ["メロン", "ゼリー", "夕張", "定番土産", "モンドセレクション"], emoji: "🍈", price: "¥1,000〜3,000", shop: "道内各所・新千歳空港", airports: ["新千歳空港"], lat: 42.7752, lng: 141.6923 },
  { id: "s68", region: "富良野", name: "富良野メロン", aliases: ["富良野メロン", "ふらのメロン"], category: "グルメ", tags: ["メロン", "フルーツ", "富良野", "夏季限定"], emoji: "🍈", price: "¥3,000〜5,000", shop: "ふらのマルシェ・道の駅", lat: 43.2999, lng: 142.4067 },
  { id: "s69", region: "旭川", name: "旭川家具（ミニチュア木工品）", aliases: ["旭川家具", "木工品", "旭川クラフト"], category: "雑貨・伝統工芸", tags: ["木工", "クラフト", "インテリア", "北海道産木材", "一生もの"], emoji: "🪵", price: "¥3,000〜5,000", shop: "旭川デザインセンター", stations: ["旭川駅"], lat: 43.7622, lng: 142.3597 },
  { id: "s70", region: "アイヌ", name: "アイヌ刺繍・工芸品", aliases: ["アイヌ工芸", "アイヌ刺繍", "アイヌ文様", "ainu craft"], category: "雑貨・伝統工芸", tags: ["アイヌ文化", "伝統工芸", "刺繍", "一生もの", "文化的価値"], emoji: "🪡", price: "¥3,000〜5,000", shop: "ウポポイ（民族共生象徴空間）白老", lat: 42.5559, lng: 141.3611 },
  { id: "s71", region: "帯広", name: "十勝地サイダー（アスパラ・コーンなど）", aliases: ["十勝サイダー", "アスパラサイダー", "コーンサイダー"], category: "グルメ", tags: ["サイダー", "ユニーク", "十勝", "野菜サイダー", "話題"], emoji: "🥤", price: "〜¥1,000", shop: "道の駅・十勝各所", lat: 42.9153, lng: 143.1958 },
  { id: "s72", region: "函館", name: "トラピスト修道院バター（函館郊外）", aliases: ["トラピストバター", "修道院バター", "トラピスト"], category: "グルメ", tags: ["バター", "修道院", "濃厚", "函館郊外", "希少"], emoji: "🧈", price: "¥1,000〜3,000", shop: "トラピスト修道院 直売所", lat: 41.9007, lng: 140.7068 },
  { id: "s73", region: "札幌", name: "えびそば一幻 お土産ラーメン（えびみそ・えびしお）", aliases: ["一幻", "えびそば一幻", "いちげん", "えびラーメン", "ichigen"], category: "グルメ", tags: ["ラーメン", "えび", "味噌", "塩", "札幌名店", "お土産ラーメン", "生麺"], emoji: "🍜", price: "¥1,000〜3,000", shop: "えびそば一幻 総本店・新千歳空港", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0550, lng: 141.3517 },
  { id: "s74", region: "札幌", name: "すみれ お土産ラーメン（味噌・塩・醤油）", aliases: ["すみれ", "札幌すみれ", "sumire ramen"], category: "グルメ", tags: ["ラーメン", "味噌", "札幌名店", "お土産ラーメン", "生麺", "濃厚"], emoji: "🍜", price: "¥1,000〜3,000", shop: "すみれ 各店舗・新千歳空港", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 43.0550, lng: 141.3517 },
  { id: "s75", region: "札幌", name: "麺屋彩未 お土産ラーメン（味噌・醤油）", aliases: ["彩未", "さいみ", "麺屋彩未", "saimi"], category: "グルメ", tags: ["ラーメン", "味噌", "醤油", "札幌名店", "お土産ラーメン", "行列店"], emoji: "🍜", price: "¥1,000〜3,000", shop: "新千歳空港・道内土産店", airports: ["新千歳空港"], lat: 43.0407, lng: 141.3736 },
  { id: "s76", region: "旭川", name: "梅光軒 お土産ラーメン（醤油）", aliases: ["梅光軒", "ばいこうけん", "旭川ラーメン梅光軒"], category: "グルメ", tags: ["ラーメン", "醤油", "旭川名店", "お土産ラーメン", "魚介系"], emoji: "🍜", price: "¥1,000〜3,000", shop: "梅光軒 各店舗・新千歳空港", airports: ["新千歳空港"], stations: ["旭川駅"], lat: 43.7622, lng: 142.3597 },
  { id: "s77", region: "函館", name: "あじさい お土産ラーメン（塩）", aliases: ["あじさい", "函館あじさい", "ajisai ramen"], category: "グルメ", tags: ["ラーメン", "塩", "函館名店", "お土産ラーメン", "あっさり"], emoji: "🍜", price: "¥1,000〜3,000", shop: "あじさい 各店舗・函館駅", airports: ["函館空港"], stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s78", region: "札幌", name: "北海道 名店ラーメン食べ比べセット", aliases: ["ラーメン詰め合わせ", "食べ比べセット", "ラーメンセット"], category: "グルメ", tags: ["ラーメン", "詰め合わせ", "食べ比べ", "ギフト向け", "複数店舗"], emoji: "🍜", price: "¥3,000〜5,000", shop: "新千歳空港 お土産処", airports: ["新千歳空港"], stations: ["札幌駅"], lat: 42.7752, lng: 141.6923 },
];

const SOUVENIR_REGIONS = [...new Set(SOUVENIR_DB.map(s => s.region))];

// ══════════════════════════════════════════════════
// 🔎 検索ロジック（スコア付き：チャットは強い一致のみ採用）
// ══════════════════════════════════════════════════
function scoreSouvenirs(query, db = SOUVENIR_DB) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  return db.map((item) => {
    let score = 0;
    [{ v: item.name, w: 3 }, { v: item.shop, w: 2 }, { v: item.region, w: 2 }, { v: item.category, w: 1 }, { v: (item.tags || []).join(" "), w: 1 }]
      .forEach(({ v, w }) => { if (v && v.toLowerCase().includes(q)) score += w; });
    (item.tags || []).forEach((tag) => {
      const tl = tag.toLowerCase();
      if (tl.includes(q) || q.includes(tl)) score += 1;
    });
    (item.aliases || []).forEach((al) => { if (q.includes(al.toLowerCase())) score += 4; });
    if (item.region && q.includes(item.region.toLowerCase())) score += 2;
    if (item.name && q.includes(item.name.toLowerCase())) score += 4;
    return { item, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
}
function matchSouvenirs(query, db = SOUVENIR_DB) { return scoreSouvenirs(query, db).map(s => s.item); }
function findItemInText(text) {
  const q = text.toLowerCase();
  return SOUVENIR_DB.find(item => (item.aliases || []).some(al => q.includes(al.toLowerCase())) || q.includes(item.name.toLowerCase())) || null;
}

// ══════════════════════════════════════════════════
// 🧠 こころんの頭脳 v3
// ══════════════════════════════════════════════════
const CHAT_REGIONS = ["旭川", "札幌", "函館", "釧路", "北見", "小樽", "帯広", "富良野", "根室", "稚内", "網走", "苫小牧", "室蘭", "登別", "知床", "千歳", "洞爺湖", "砂川", "中札内", "十勝", "余市", "夕張", "白老", "アイヌ"];
const OTHER_KNOWN_PLACES = ["中標津", "名寄", "士別", "夕張", "岩見沢", "浦河", "積丹", "余市", "芦別", "深川", "留萌", "紋別", "遠軽", "厚岸", "標茶", "弟子屈", "白老", "伊達", "江別", "恵庭"];
const KURANAMA_LINK_JA = "https://www.google.com/search?q=%E8%94%B5%E7%94%9F+%E3%83%AD%E3%83%90%E8%8F%93%E5%AD%90%E5%8F%B8+%E5%85%AC%E5%BC%8F";
const KURANAMA_LINK_EN = "https://www.google.com/search?q=Kuranama+Roba+Kashi+Asahikawa+official";

const LOOKUP_RE = /歴史|由来|とは(?:何|なに)?[？?]?$|について(?:教えて|調べて|知りたい)?|調べて|検索して|意味|創業|いつ(?:でき|から)|誰が|どこの会社|発祥|history|origin|look ?up|search|tell me about|who made|founded|when was/i;
const RECOMMEND_RE = /おすすめ|オススメ|お勧め|ある[？?]?|ありますか|欲しい|ほしい|買いたい|何がいい|なにがいい|選んで|recommend|suggest|ideas|any (souvenir|gift)|what should i (buy|get)/i;

function cleanLookupTopic(msg) {
  let t = msg
    .replace(/(の歴史|の由来|の意味|について)(を?)(教えて|調べて|知りたい)?(ください)?()?(は|わ|も|って)?[。！!？?]*$/g, "")
    .replace(/(を?)(調べて|教えて|検索して)(ください)?()?(は|わ|も)?[。！!？?]*$/g, "")
    .replace(/(とは何|とはなに|とは|って何|ってなに)(は|わ|も)?[？?。]*$/g, "")
    .replace(/^(look up|search for|search|tell me about|what is|who is)\s+/i, "")
    .replace(/(the history of|history of|origin of)\s+/i, "")
    .trim();
  return t || msg.trim();
}

function kokoronBrainLogic(userMsg, context, lang, communityPosts = []) {
  const msg = userMsg.trim();
  const keep = { ...context };
  const ja = lang === "ja";
  const wasDown = context.mood === "down";
  keep.mood = null;

  if (/(死にたい|消えたい|いなくなりたい|自殺|リスカ|want to die|kill myself|suicide)/i.test(msg)) {
    keep.mood = "down";
    return { mode: "reply", text: ja
      ? "話してくれてありがとう。それだけ苦しい気持ちを、ここまでひとりで抱えてきたんだね…。\n僕はアプリの中の小さな存在だから、そばで話を聞くことしかできない。だからこそ、信頼できる人や相談窓口（よりそいホットライン 0120-279-338／24時間・無料）にも、その気持ちを話してみてほしい。\nあなたがここにいてくれること、僕はうれしい。"
      : "Thank you for telling me. Carrying that alone must have been so heavy…\nI'm just a small presence inside an app, so all I can do is listen — that's why I hope you'll also share this with someone you trust, or a professional helpline. I'm glad you're here.",
      expression: "sad", context: keep };
  }

  if (/(疲れた|つかれた|つらい|辛い|しんどい|悲しい|かなしい|落ち込|凹ん|へこん|寂しい|さみしい|さびしい|不安|泣きそう|泣いた|失敗し|うまくいかな|眠れな|やる気が出な|もうだめ|もう無理|もうムリ|tired|so sad|lonely|depressed|anxious|failed|can't sleep)/i.test(msg)) {
    keep.mood = "down";
    return { mode: "reply", text: ja
      ? "そっか…それは、しんどかったね。\n無理に元気を出さなくて大丈夫。よかったら、何があったかゆっくり聞かせてほしい。僕はここにいる。"
      : "That sounds really hard…\nYou don't have to force yourself to feel better. I'm here if you want to talk about it.",
      expression: "concerned", context: keep };
  }

  if (/(使えない|役に立たない|ちゃんと答えて|ちゃんとして|違うよ|そうじゃない|わかってない|分かってない|話聞いてる|not helpful|you're wrong|that's not what)/i.test(msg)) {
    return { mode: "reply", text: ja
      ? "ごめん…うまく汲み取れてなかった。\nもう少しだけ詳しく教えてもらえたら、今度こそちゃんと答えたい。「地域名＋おすすめ」や「〇〇について調べて」の形が得意。"
      : "I'm sorry… I didn't understand that well.\nCould you tell me a bit more? I'll do my best this time.",
      expression: "sad", context: keep };
  }

  if (/(愛してる|あいしてる|大好き|だいすき|好きだよ|love you|luv you)/i.test(msg)) {
    return { mode: "reply", text: ja
      ? "え、えぇっ！？　ぼ、僕も…大好きだ…！\nそんなこと言われたら、顔まで真っピンクになっちゃう🩷\nこれからも、あなたのギフト選びをぜんりょくで手伝わせてほしい。"
      : "W-what!? I… I love you too…!\nYou're making my whole face turn pink 🩷", expression: "tokimeki", context: keep };
  }
  if (/(ありがとう|ありがと|感謝|thank you|thanks|thx)/i.test(msg)) {
    return { mode: "reply", text: ja
      ? "どういたしましてだ…！\nそんなふうに言ってもらえると、照れて顔がピンクになっちゃう🩷\nまたいつでも聞いてほしい。"
      : "You're welcome…! That makes me blush all pink 🩷", expression: "tokimeki", context: keep };
  }
  if (/(かわいい|可愛い|cute)/i.test(msg)) {
    return { mode: "reply", text: ja ? "か、かわいい…！？ぼ、僕のこと…？\nうう、照れる…🩷" : "C-cute…!? Me…? I'm blushing…🩷", expression: "tokimeki", context: keep };
  }

  if (/(おはよう|こんにちは|こんばんは|やあ|ハロー|hello|^hi\b|hey there)/i.test(msg)) {
    if (wasDown) {
      keep.mood = "down";
      return { mode: "reply", text: ja
        ? "こんにちは。少しは気持ち、落ち着いた？\n今日は無理せずいこう。話したくなったら、いつでもここにいる。"
        : "Hello. Feeling a little better?\nTake it easy today. I'm here whenever you want to talk.",
        expression: "concerned", context: keep };
    }
    return { mode: "reply", text: ja
      ? "こんにちは！🌱 今日はどんなギフトの話をする？\n地域名で聞いてくれたらおすすめを、「〇〇を調べて」ならネットで調べてくる。"
      : "Hello! 🌱 Ask me with a region for picks, or say \"look up ___\" and I'll search the web.",
      expression: "happy", context: keep };
  }
  if (/(おやすみ|眠い|ねむい|寝る|good ?night|sleepy)/i.test(msg)) {
    return { mode: "reply", text: ja ? "ふぁ…おやすみなさいだ…💤\nいい夢を見てほしい。また明日、ギフトの話しよう。" : "Yaaawn… good night…💤 Sweet dreams.", expression: "sleepy", context: keep };
  }
  if (/(すごい|やばい|まじで|マジで|えっ|amazing|wow)/i.test(msg) && msg.length < 15) {
    return { mode: "reply", text: ja ? "びっくりさせた！？😳 ギフトの世界は奥が深いよ。" : "Surprised you!? 😳 The gift world runs deep.", expression: "surprised", context: keep };
  }

  // ── 条件の解除：「関係なく」「気にしない」「抜きで」などの否定表現でダイエットモードを外す ──
  const DIET_TOPIC_RE = /(ダイエット|カロリー|ヘルシー|糖質|痩せ|やせ|diet|calorie|healthy)/i;
  const DIET_OFF_RE = /(関係な(く|い|かったら|ければ|いとしたら|くて)|抜き(で|に|は|にして)?|気にし(ない|なく|なかったら)|気にせず|無視して|じゃなく(て)?|以外で?|やめた|終わ(った|り)|もういい|普通ので(いい|大丈夫|OK)|regardless|not on a diet|forget (the )?diet|ignore)/i;
  const dietOff = (DIET_TOPIC_RE.test(msg) && DIET_OFF_RE.test(msg))
    || (context.condition === "diet" && /(関係な(く|い|かったら|ければ)|気にしない|気にせず|抜きで|もういい)/.test(msg));
  if (dietOff) {
    keep.condition = null;
    const regionNow = CHAT_REGIONS.find(r => msg.includes(r)) || context.lastRegion || null;
    const venueMention = Object.keys({ ...AIRPORTS, ...STATIONS }).some(v => msg.includes(v));
    const productHit0 = findItemInText(msg.replace(/ダイエット|カロリー|ヘルシー|糖質/g, ""));
    if (!venueMention && !productHit0) {
      if (regionNow) {
        keep.lastRegion = regionNow;
        const freePicks = SOUVENIR_DB.filter(s => s.region === regionNow).slice(0, 3);
        if (freePicks.length > 0) {
          keep.lastItemId = freePicks[0].id;
          return { mode: "reply", text: ja
            ? "了解！じゃあカロリーは気にせず、" + regionNow + "のおいしいもの全部から選ぶ🔥\n\n" + formatItemsCompare(freePicks, ja) + kcalFooter(freePicks, ja) + "\n気になるのはあった？"
            : "Got it! Full-flavor mode for " + regionNow + "🔥\n\n" + formatItemsCompare(freePicks, ja) + kcalFooter(freePicks, ja),
            expression: "happy", context: keep };
        }
      }
      return { mode: "reply", text: ja
        ? "了解！じゃあカロリーは気にせず、おいしさ全振りで探す🔥\nどの地域（または空港・駅）で探す？"
        : "Got it! Full-flavor mode then🔥 Which area, airport, or station shall we search?",
        expression: "happy", context: keep };
    }
    // 商品名や売り場の指定があるときは、条件を外したまま下の通常処理へ流す
  }

  const lastItem = context.lastItemId ? SOUVENIR_DB.find(s => s.id === context.lastItemId) : null;
  if (lastItem && msg.length < 30) {
    if (/どこ(で|に)?(買|売|手に入)|場所|お店|店/.test(msg)) {
      const spots = [...(lastItem.stations || []), ...(lastItem.airports || [])];
      const spotNote = spots.length > 0
        ? (ja ? "\nそれと、" + spots.join("・") + "でも買える！" : "\nAlso available at " + spots.join(", ") + "!")
        : "";
      return { mode: "reply", text: ja
        ? "「" + lastItem.name + "」は、" + lastItem.shop + "（" + lastItem.region + "）で買える。" + shopMapLink(lastItem, true) + "\n🚪📦 会いに行けなくても、気持ちはちゃんと届けられる → [楽天市場でさがす](" + rakutenSearchUrl(lastItem.name) + ")　[Amazonでさがす](" + amazonSearchUrl(lastItem.name) + ")" + spotNote
        : "You can get \"" + lastItem.name + "\" at " + lastItem.shop + " (" + lastItem.region + ")." + shopMapLink(lastItem, false) + "\n🛒 [Search Rakuten](" + rakutenSearchUrl(lastItem.name) + ") [Search Amazon](" + amazonSearchUrl(lastItem.name) + ")" + spotNote,
        expression: "happy", context: keep };
    }
    if (/いくら|値段|価格|how much/i.test(msg)) {
      return { mode: "reply", text: ja
        ? "「" + lastItem.name + "」の価格帯は" + lastItem.price + "。"
        : "\"" + lastItem.name + "\" is in the " + lastItem.price + " range.",
        expression: "happy", context: keep };
    }
    if (/カロリー|kcal|キロカロリー/i.test(msg)) {
      return { mode: "reply", text: ja
        ? (lastItem.kcalNote
          ? "「" + lastItem.name + "」は " + lastItem.kcalNote + " だ。正確な数値は、商品パッケージの栄養成分表示も見てほしい。"
          : "ごめん、「" + lastItem.name + "」の正確なカロリーはまだ僕のデータに無い…🙏 パッケージの栄養成分表示を確認してほしい。")
        : (lastItem.kcalNote
          ? "\"" + lastItem.name + "\": " + lastItem.kcalNote + " — check the package for exact numbers."
          : "Sorry, no calorie data yet for \"" + lastItem.name + "\" — please check the package🙏"),
        expression: lastItem.kcalNote ? "happy" : "concerned", context: keep };
    }
    if (/^(他|ほか)(に|の)?(は|も)?/.test(msg) || /他に(おすすめ|ある)|ほかに(おすすめ|ある)|anything else|other options/i.test(msg)) {
      const dietNow = context.condition === "diet";
      const pool = SOUVENIR_DB.filter(s => s.region === lastItem.region && s.id !== lastItem.id && (!dietNow || (s.tags || []).some(tg => HEALTHY_TAG_RE.test(tg))));
      if (pool.length > 0) {
        keep.lastItemId = pool[0].id;
        return { mode: "reply", text: ja
          ? lastItem.region + "なら、他に「" + pool.slice(0, 2).map(o => o.name).join("」「") + "」もある。気になるのはあった？"
          : "In " + lastItem.region + ", there's also " + pool.slice(0, 2).map(o => o.name).join(" and ") + ".",
          expression: "wink", context: keep };
      }
      if (dietNow) {
        return { mode: "reply", text: ja
          ? lastItem.region + "のヘルシー系は、いま紹介したものでぜんぶ…正直に言うね🙏\n他の地域なら、🍬北見ハッカ飴や🌿がごめ昆布スナック（函館）もヘルシー系の定番。"
          : "That's all the healthy picks I have for " + lastItem.region + "… being honest🙏",
          expression: "concerned", context: keep };
      }
    }
  }

  const dietWord = !dietOff && /(ダイエット|痩せ|やせ|糖質制限|ヘルシー|低カロリー|カロリー(を?気にし|控えめ|低め|が?低い)|diet|healthy|low.?cal)/i.test(msg);
  if (dietWord) keep.condition = "diet";
  const dietActive = !dietOff && (dietWord || context.condition === "diet");
  const isLookup = LOOKUP_RE.test(msg);
  const isRecommend = RECOMMEND_RE.test(msg);
  const mentionedRegion = CHAT_REGIONS.find((r) => msg.includes(r));
  const mentionedUnknownPlace = !mentionedRegion && OTHER_KNOWN_PLACES.find((p) => msg.includes(p));

  const VENUES = { ...AIRPORTS, ...STATIONS };
  const venueEntry = Object.entries(VENUES).find(([name, info]) => msg.includes(name) || (info.aliases || []).some(a => msg.toLowerCase().includes(a.toLowerCase())));
  if (venueEntry && !isLookup) {
    const [venueName, info] = venueEntry;
    const isStation = !!STATIONS[venueName];
    const field = isStation ? "stations" : "airports";
    let items = SOUVENIR_DB.filter(s => (s[field] || []).includes(venueName));
    if (dietActive) items = items.filter(s => (s.tags || []).some(tg => HEALTHY_TAG_RE.test(tg)));
    const mapLink = mapsUrl(info.lat, info.lng);
    if (items.length > 0) {
      keep.lastItemId = items[0].id;
      const head = dietActive
        ? (ja ? venueName + "でヘルシー寄りに選ぶなら、これが比べやすい💪" : "Healthy-ish picks at " + venueName + "💪")
        : (ja ? venueName + "でよく買われる定番はこのあたり" + (isStation ? "🚉" : "✈️") : "Popular picks at " + venueName + "" + (isStation ? "🚉" : "✈️"));
      const shownVenueItems = items.slice(0, 4);
      const footer = kcalFooter(shownVenueItems, ja);
      return { mode: "reply", text: head + "\n\n" + formatItemsCompare(shownVenueItems, ja) + footer + "\n🗺️ [" + venueName + "を地図で見る](" + mapLink + ")" + findCommunityNote(venueName, communityPosts, ja),
        expression: "happy", context: keep };
    }
    if (dietActive) {
      return { mode: "reply", text: ja
        ? "正直に言う…" + venueName + "の売店データの中に、ヘルシー系として登録できているものがまだ無い🙏\n🍬北見ハッカ飴・🌿がごめ昆布スナックあたりがヘルシー系の定番だから、見かけたらチェックしてほしい。"
        : "Being honest… no healthy-tagged items in my " + venueName + " data yet🙏",
        expression: "concerned", context: keep };
    }
    return { mode: "reply", text: ja
      ? venueName + "の売店情報は、まだ僕のデータがそんなに多くない…正直に言うね🙏\n🗺️ [場所だけ地図で見る](" + mapLink + ")"
      : "I don't have much data on " + venueName + "'s shops yet…🙏\n🗺️ [See it on Maps](" + mapLink + ")",
      expression: "concerned", context: keep };
  }

  if (mentionedUnknownPlace && !isLookup) {
    return { mode: "reply", text: ja
      ? "正直に言う…「" + mentionedUnknownPlace + "」のお土産は、まだ僕のデータベースに入っていない🙏\n今得意なのは旭川・札幌・函館・釧路・北見・小樽・帯広・富良野・根室・稚内・網走・苫小牧・室蘭・登別・知床・千歳・洞爺湖だから、その中で聞いてもらえたら嬉しい！"
      : "Being honest… I don't have data on \"" + mentionedUnknownPlace + "\" souvenirs yet🙏\nI cover the major Hokkaido areas — try asking about one of those!",
      expression: "concerned", context: keep };
  }

  const kuranamaHit = /蔵生|くらなま|kuranama|ロバ菓子|roba|サン蔵人|the ?sun/i.test(msg)
    || (/生チョコ|なまチョコ|chocolate/i.test(msg) && /クッキー|cookie/i.test(msg))
    || (/生チョコ|なまチョコ/i.test(msg) && /旭川|asahikawa/i.test(msg));
  if (kuranamaHit && !LOOKUP_RE.test(msg.replace(/なんて言うんだっけ|何だっけ|なんだっけ/g, ""))) {
    keep.lastItemId = "s2";
    const link = ja ? KURANAMA_LINK_JA : KURANAMA_LINK_EN;
    if (/(健康|体にいい|ヘルシー|healthy)/i.test(msg)) {
      return { mode: "reply", text: ja
        ? "蔵生は、素材にとことん真面目なお菓子。\n北海道産小麦粉と、てんさい由来のビートグラニュー糖を100%使用、保存料も不使用なんだ✨ しっとりサクサクの生地に、とろける生チョコ…罪深いほどおいしい。\nただ、生チョコ系だから食べ過ぎには注意よ。詳しくは [ロバ菓子司の公式情報はこちら](" + link + ") 。"
        : "Kuranama is a seriously honest sweet: 100% Hokkaido wheat + beet sugar, no preservatives✨ Just don't overdo it.\n[Official info here](" + link + ")",
        expression: "happy", context: keep };
    }
    return { mode: "reply", text: ja
      ? "それ、「蔵生（くらなま）」だ！\n旭川のロバ菓子司が作る、生チョコをサンドしたサクサクしっとりのクッキーだ✨ 北海道産小麦粉＋ビートグラニュー糖100%・保存料不使用で、素材へのこだわりが半端ない。\n旭川駅ビルやお土産店で買えるよ。詳しくは [ロバ菓子司の公式情報はこちら](" + link + ") 。"
      : "That's \"Kuranama\"! A soft cookie with nama-chocolate from Roba Kashi-tsukasa in Asahikawa✨\n[Official info here](" + link + ")",
      expression: "celebrate", context: keep };
  }

  if (dietWord) {
    const dietRegion = mentionedRegion || context.lastRegion || null;
    if (dietRegion) keep.lastRegion = dietRegion;
    return buildDietReply(dietRegion, keep, ja, communityPosts);
  }

  if (isLookup && !isRecommend) {
    const topic = cleanLookupTopic(msg);
    const itemHit = findItemInText(msg);
    return { mode: "web", topic, itemHit, context: keep };
  }

  // ── お店・ブランド名で聞かれたら、その店のおすすめ商品を一覧で返す ──
  const BRANDS = ["六花亭", "ロイズ", "北菓楼", "きのとや", "柳月", "もりもと", "花畑牧場", "ルタオ", "壺屋", "千秋庵", "わかさいも", "ホリ", "スナッフルス", "石屋製菓", "セイコーマート", "ハセガワストア", "ラッキーピエロ", "トラピスチヌ", "五勝手屋", "ニッカ"];
  const brandHit = BRANDS.find(b => msg.includes(b));
  if (brandHit && !isLookup) {
    let brandItems = SOUVENIR_DB.filter(s => (s.shop || "").includes(brandHit) || (s.name || "").includes(brandHit) || (s.tags || []).includes(brandHit));
    if (dietActive) {
      const bh = brandItems.filter(s => (s.tags || []).some(tg => HEALTHY_TAG_RE.test(tg)));
      if (bh.length > 0) brandItems = bh;
    }
    if (brandItems.length > 0) {
      keep.lastItemId = brandItems[0].id;
      const shownBrand = brandItems.slice(0, 4);
      const brandSpots = [...new Set(shownBrand.flatMap(i => [...(i.stations || []), ...(i.airports || [])]))];
      const spotNote = brandSpots.length > 0 ? (ja ? "\n🛍️ " + brandSpots.join("・") + "などで買える" : "\n🛍️ Available at " + brandSpots.join(", ") + "") : "";
      return { mode: "reply", text: (ja
        ? brandHit + "のおすすめ商品はこのあたり✨\n\n" + formatItemsCompare(shownBrand, ja) + kcalFooter(shownBrand, ja) + spotNote + shopMapLink(brandItems[0], ja)
        : "Top picks from " + brandHit + "✨\n\n" + formatItemsCompare(shownBrand, ja) + kcalFooter(shownBrand, ja) + spotNote) + findCommunityNote(brandHit, communityPosts, ja),
        expression: "celebrate", context: keep };
    }
  }

  const effectiveRegion = mentionedRegion || context.lastRegion || null;
  if (mentionedRegion) keep.lastRegion = mentionedRegion;

  let scored = scoreSouvenirs(msg);
  const explicitHit = scored.length > 0 && scored[0].score >= 4;

  if (dietActive && !explicitHit) {
    return buildDietReply(effectiveRegion, keep, ja, communityPosts);
  }

  if (effectiveRegion) {
    const rf = scored.filter((s) => s.item.region === effectiveRegion).map((s) => ({ item: s.item, score: s.score + 2 }));
    if (rf.length > 0) { scored = rf; keep.lastRegion = effectiveRegion; }
    else if (scored.length === 0) {
      const ra = SOUVENIR_DB.filter((m) => m.region === effectiveRegion).slice(0, 3).map(item => ({ item, score: 2 }));
      if (ra.length > 0) { scored = ra; keep.lastRegion = effectiveRegion; }
    }
  }
  const strong = scored.filter(s => s.score >= 2).slice(0, 3).map(s => s.item);

  if (strong.length === 0) {
    return { mode: "web", topic: cleanLookupTopic(msg), itemHit: findItemInText(msg), context: keep };
  }
  const top = strong[0];
  keep.lastItemId = top.id;
  const others = strong.length > 1
    ? (ja ? "\n他には「" + strong.slice(1).map(m => m.name).join("」「") + "」もある。" : "\nAlso: " + strong.slice(1).map(m => m.name).join(", ") + ".")
    : "";
  const contentsNote = top.contents ? (ja ? "\n📦 " + top.contents : "\n📦 " + top.contents) : "";
  const text = ja
    ? "「" + top.name + "」がおすすめ。\n" + top.shop + "（" + top.region + "）で買えて、価格帯は" + top.price + (top.kcalNote ? "  🔥" + top.kcalNote : "") + contentsNote + "\n特徴は" + (top.tags || []).slice(0, 4).join("・") + "だ✨" + others + "\n「どこで買える？」「いくら？」「カロリーは？」って続けて聞いてくれてもいい。" + findCommunityNote(top.name, communityPosts, ja)
    : "I'd recommend \"" + top.name + "\".\nAt " + top.shop + " (" + top.region + "), " + top.price + (top.kcalNote ? "  🔥" + top.kcalNote : "") + contentsNote + "\nKnown for: " + (top.tags || []).slice(0, 4).join(", ") + "✨" + others + findCommunityNote(top.name, communityPosts, ja);
  return { mode: "reply", text, expression: strong.length > 1 ? "celebrate" : "wink", context: keep };
}

const AIRPORTS = {
  "新千歳空港": { lat: 42.7752, lng: 141.6923, aliases: ["新千歳", "千歳空港", "chitose airport", "new chitose"] },
  "旭川空港": { lat: 43.6708, lng: 142.4477, aliases: ["asahikawa airport"] },
  "函館空港": { lat: 41.7700, lng: 140.8219, aliases: ["hakodate airport"] },
  "たんちょう釧路空港": { lat: 43.0409, lng: 144.1930, aliases: ["釧路空港", "kushiro airport"] },
};

// ── 🛒 アフィリエイト設定 ─────────────────────────────
// 公開後にIDを取得したら、下の2行に貼るだけで全リンクに自動反映される。
//   Amazon: アソシエイト審査通過後のトラッキングID（例: "magokoro-22"）
//   楽天  : 楽天アフィリエイトID（例: "1a2b3c4d.5e6f7g8h"）
// IDが空の間は通常の検索リンクとして動く（見た目は変わらない）。
// ※ ステマ規制(2023〜)により、ID設定後は広告表記が必須。
//    GiftPanelに表記済みなので、IDを入れてもそのまま合法に運用できる。
const AFFILIATE = { amazonTag: "", rakutenId: "560232e4.c8e349f5.560232e5.8f8fced5" };

function amazonSearchUrl(name) {
  const base = "https://www.amazon.co.jp/s?k=" + encodeURIComponent(name);
  return AFFILIATE.amazonTag ? base + "&tag=" + AFFILIATE.amazonTag : base;
}
function rakutenSearchUrl(name) {
  const target = "https://search.rakuten.co.jp/search/mall/" + encodeURIComponent(name) + "/";
  return AFFILIATE.rakutenId
    ? "https://hb.afl.rakuten.co.jp/hgc/" + AFFILIATE.rakutenId + "/?pc=" + encodeURIComponent(target) + "&m=" + encodeURIComponent(target)
    : target;
}

// 🔗 購入リンクの一元管理：楽天→Amazonの順で返す（品質理由で楽天を先に出す）。
// item.rakutenUrl/amazonUrlが未設定(undefined)なら検索URLを自動生成、
// 明示的にnullを入れた商品はそのリンクだけ非表示にできる（転売業者しか出品がない場合など）。
function getPurchaseLinks(item) {
  const rakuten = item.rakutenUrl === null ? null : (item.rakutenUrl || rakutenSearchUrl(item.name));
  const amazon = item.amazonUrl === null ? null : (item.amazonUrl || amazonSearchUrl(item.name));
  return { rakuten, amazon, sellerType: item.sellerType || "other" };
}

// 投稿のギフト名がDB商品と確実に一致する時だけ、お取り寄せ導線を出す
// （曖昧一致で違う商品を勧めると信頼を失うので、名前の包含＋長いエイリアスのみ）
function findDbItemForPost(giftName) {
  if (!giftName || giftName.length < 3) return null;
  const g = giftName.toLowerCase();
  return SOUVENIR_DB.find(s => {
    const n = s.name.toLowerCase();
    return n.includes(g) || g.includes(n) || (s.aliases || []).some(a => a.length >= 4 && g.includes(a.toLowerCase()));
  }) || null;
}

function mapsUrl(lat, lng) {
  // 空港・駅など広い施設は座標指定
  return "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
}
function mapsUrlByShop(shopName, region) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(shopName + " " + region);
}

// 「特定の1店舗として検索できる」かどうかを判定する
// 朝市・複数店舗・「各所」系はGoogleマップで誤った場所が出てしまうのでリンクを出さない
function isSpecificShop(shopName) {
  if (!shopName) return false;
  const vague = ["各所", "各店舗", "各地", "道内", "朝市", "道の駅", "温泉街", "物産館", "アイヌコタン", "漁協", "コンビニ", "スーパー"];
  return !vague.some(w => shopName.includes(w));
}
function shopMapLink(item, ja) {
  if (!isSpecificShop(item.shop)) return "";
  const url = mapsUrlByShop(item.shop, item.region);
  return ja
    ? "\n🗺️ [Googleマップで見る](" + url + ")"
    : "\n🗺️ [See on Google Maps](" + url + ")";
}

const HEALTHY_TAG_RE = /ヘルシー|ダイエット|低カロリー/;

const STATIONS = {
  "札幌駅": { lat: 43.0687, lng: 141.3508 },
  "旭川駅": { lat: 43.7622, lng: 142.3597 },
  "函館駅": { lat: 41.7737, lng: 140.7263 },
  "小樽駅": { lat: 43.1977, lng: 140.9946 },
  "帯広駅": { lat: 42.9230, lng: 143.1965 },
};

function formatItemsCompare(items, ja) {
  return items.map(i => {
    const contentsLine = i.contents ? "\n　📦 " + i.contents : "";
    const kcal = i.kcalNote ? "  🔥 " + i.kcalNote : "";
    return i.emoji + " " + i.name + contentsLine + "\n　🏷️ " + (i.tags || []).slice(0, 3).join(ja ? "・" : ", ") + kcal;
  }).join("\n");
}

// 🔥 カロリー目安の注意書き：実データがある商品が含まれる時だけ添える
function kcalFooter(items, ja) {
  if (!items || !items.some(i => i.kcalNote)) return "";
  return ja ? "\n\n🔥の数値は目安だから、商品パッケージの表示も確認してほしい。" : "\nNumbers are estimates — check packages.";
}

function findCommunityNote(query, posts, ja) {
  if (!posts || posts.length === 0 || !query) return "";
  // 商品名が一致する投稿だけを対象にする（地域名では紐付けない）
  const hit = posts.find(p => p.giftName && p.giftName.includes(query));
  if (!hit) return "";
  const pp = hit.parts || {};
  const raw = (pp.reaction || pp.note || pp.reason || hit.review || "");
  const snip = raw.slice(0, 38) + (raw.length > 38 ? "…" : "");
  return ja
    ? "\n\n📮 まごころの投稿から：@" + hit.userName + "「" + hit.giftName + "」\n“" + snip + "”"
    : "\n\n📮 From Magokoro posts: @" + hit.userName + " \"" + hit.giftName + "\"\n“" + snip + "”";
}

function buildDietReply(region, keep, ja, posts) {
  if (!region) {
    const picks = SOUVENIR_DB.filter(s => s.id === "s9" || s.id === "s10");
    return { mode: "reply", text: ja
      ? "ダイエット中なら、正直に言う：生チョコ系はおいしいぶん脂質高めだから量に注意。\nかわりのヘルシー系は、この2つが比べやすい💪\n\n" + formatItemsCompare(picks, ja) + "\n\n地域名や「新千歳空港」「札幌駅」みたいな場所も一緒に言ってくれたら、そこ限定で探す！"
      : "On a diet? Honest take: nama-choco sweets are high in fat.\nHealthier picks💪\n\n" + formatItemsCompare(picks, ja) + "\n\nAdd a region, airport, or station and I\'ll narrow it down!",
      expression: "happy", context: keep };
  }
  const healthy = SOUVENIR_DB.filter(s => s.region === region && (s.tags || []).some(tg => HEALTHY_TAG_RE.test(tg)));
  if (healthy.length > 0) {
    keep.lastItemId = healthy[0].id;
    const picks3 = healthy.slice(0, 3);
    return { mode: "reply", text: ja
      ? region + "でダイエット中に選ぶなら、これが比べやすい💪\n\n" + formatItemsCompare(picks3, ja) + kcalFooter(picks3, ja) + "\n無理せず楽しくがいちばん！"
      : "Diet-friendly picks in " + region + "💪\n\n" + formatItemsCompare(picks3, ja) + kcalFooter(picks3, ja),
      expression: "happy", context: keep };
  }
  return { mode: "reply", text: ja
    ? "正直に言うと、" + region + "のヘルシー系お土産は、まだ僕のデータには無い…🙏\n他の地域や新千歳空港でもよければ、🍬北見ハッカ飴や🌿がごめ昆布スナック（函館）がヘルシー系の定番！"
    : "Being honest, no healthy picks for " + region + " in my data yet…🙏 If New Chitose Airport or other areas work, Kitami Mint Candy and Gagome Kombu Snack are the healthy classics!",
    expression: "concerned", context: keep };
}


function describeItem(item, lang) {
  return lang === "ja"
    ? item.emoji + " 「" + item.name + "」だね！\n" + item.region + "の" + item.shop + "で買える、" + (item.tags || []).slice(0, 4).join("・") + "が特徴のお土産だ。価格帯は" + item.price + "✨"
    : item.emoji + " \"" + item.name + "\"! From " + item.shop + " in " + item.region + ". Features: " + (item.tags || []).slice(0, 4).join(", ") + ". " + item.price + "✨";
}

// ══════════════════════════════════════════════════
// 待機ヘルパー
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ナビゲーションの順序定義（スワイプ切替に使用）
const NAV_ORDER = ["home", "search", "post", "gift", "me"];
// 位置情報取得のデモ用フォールバック座標（旭川駅）。値が変わらない定数なのでコンポーネント外に置く
// （コンポーネント内に置くと毎レンダーで新しいオブジェクトになり、useEffectの依存配列に入れられない）
const demoOrigin = { lat: 43.7628, lng: 142.3584 };
// ナビゲーションのメタ情報（絵文字・ラベルキー）
const NAV_META = [
  { nav: "home",   emoji: "🏠" },
  { nav: "search", emoji: "🌱" },
  { nav: "post",   emoji: "✍️" },
  { nav: "gift",   emoji: "🎁" },
  { nav: "me",     emoji: "👤" },
];

// ── デスクトップ判定フック ──────────────────────────────────────────────────
// プロフィール写真を小さく圧縮する（Firestoreの容量制限を考慮し200x200・JPEG化）
function resizeImageFile(file, maxSize = 200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isDesktop;
}

// 🌐 Wikipedia 実検索
// ══════════════════════════════════════════════════
async function searchWikipedia(query, lang) {
  const host = lang === "ja" ? "https://ja.wikipedia.org" : lang === "ko" ? "https://ko.wikipedia.org" : "https://en.wikipedia.org";
  const sr = await fetch(host + "/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=" + encodeURIComponent(query));
  if (!sr.ok) return null;
  const sj = await sr.json();
  const hit = sj && sj.query && sj.query.search && sj.query.search[0];
  if (!hit) return null;
  const pr = await fetch(host + "/api/rest_v1/page/summary/" + encodeURIComponent(hit.title));
  if (!pr.ok) return null;
  const pj = await pr.json();
  if (!pj || !pj.extract) return null;
  const url = (pj.content_urls && pj.content_urls.desktop && pj.content_urls.desktop.page) || host + "/wiki/" + encodeURIComponent(hit.title);
  return { title: hit.title, extract: pj.extract.slice(0, 260), url };
}

// ══════════════════════════════════════════════════
// 🔗 Markdownリンク → <a>
// ══════════════════════════════════════════════════
function sanitizeUrl(url) {
  // javascript:やdata:などの危険なプロトコルを弾く
  // こころんが生成するのはhttps://のみだが、念のため全チャンネルで検証
  if (!url) return "#";
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return "#";
  if (!lower.startsWith("https://") && !lower.startsWith("http://")) return "#";
  return url;
}

function renderChatText(text) {
  const parts = [];
  const regex = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m, k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const safeUrl = sanitizeUrl(m[2]);
    parts.push(<a key={"lk-" + k++} href={safeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#C08A3E", textDecoration: "underline", fontWeight: "bold" }}>{m[1]}</a>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ══════════════════════════════════════════════════
// 投稿1件あたりの最大文字数
const MAX_REVIEW_LENGTH = 1000;

// 🚫 こころんチェック
// ══════════════════════════════════════════════════
const NG_WORDS = [
  "クソ", "くそ", "糞", "ゴミ", "ごみ", "最悪", "最低", "死ね", "しね", "殺", "バカ", "ばか", "馬鹿", "アホ", "あほ",
  "うざい", "ウザい", "ウザ", "きもい", "キモい", "キモ", "ふざけんな", "ふざけるな", "むかつく", "ムカつく", "ムカ",
  "ざけんな", "ありえない", "詐欺", "ぼったくり", "ボッタクリ", "二度と買わない", "金返せ",
  "shit", "fuck", "fck", "damn", "crap", "stupid", "idiot", "hate this", "ugly", "awful", "terrible", "worst", "scam", "trash", "garbage",
];

function kokoronCheck(text, lang) {
  const trimmed = (text || "").trim();
  const ja = lang === "ja";
  if (!trimmed) return { status: "pending", feedback: "" };
  if (trimmed.length < 10) {
    return { status: "ng", feedback: ja
      ? "もう少しだけ詳しく書いてほしい！\n\n😊 良いところ：書き始めてくれてありがとう！その一歩が大事！\n✏️ 直してほしいところ：今は" + trimmed.length + "文字だ。「なぜ選んだか」「どんな反応だったか」を1行足すだけで、ぐっと参考になるレビューになる〜"
      : "Just a bit more!\n\n😊 Good: You started writing!\n✏️ Fix: " + trimmed.length + " chars now — add why you chose it or the reaction~" };
  }
  const lower = text.toLowerCase();
  const foundNg = NG_WORDS.find(w => lower.includes(w.toLowerCase()));
  if (foundNg) {
    return { status: "ng", feedback: ja
      ? "ちょっと待ってほしい！🙏\n\n😊 良いところ：しっかり気持ちを言葉にできているのは素敵だ！正直な感想はレビューの宝だ！\n✏️ 直してほしいところ：「" + foundNg + "」という表現は、読んだ人が悲しい気持ちになっちゃうかもだ…。「期待とは少し違った」「私の好みには合わなかった」みたいに言い換えてもらえると嬉しい🕊️"
      : "Hold on!🙏\n\n😊 Good: Honest feelings are the treasure of a review!\n✏️ Fix: \"" + foundNg + "\" might sting readers… try \"didn't meet my expectations\" instead🕊️" };
  }
  const hasPositive = /(よかっ|嬉し|うれし|喜ん|よろこ|おいし|美味し|最高|素晴|すばら|感動|ありがと|笑顔|great|good|loved|happy|delicious|amazing|wonderful|perfect|smile)/i.test(text);
  const hasDetail = /(買|購入|駅|空港|店|オンライン|ネット|手作り|作れ|bought|store|station|online|shop|made)/i.test(text);
  let praise = ja ? "具体的な体験が書けていて、とても読みやすい！" : "Clear, concrete experience!";
  if (hasPositive && hasDetail) praise = ja ? "気持ちのこもった言葉と、入手方法の情報が両方入ってて、パーフェクトなレビューだ！" : "Heartfelt words AND how to get it — perfect!";
  else if (hasPositive) praise = ja ? "気持ちの言葉が入ってて、あったかいレビューだ！" : "Warm, heartfelt words!";
  else if (hasDetail) praise = ja ? "入手方法の情報があって、次の人の役に立つ！" : "Purchase info — super helpful!";
  return { status: "ok", feedback: ja
    ? "✅ 合格！このまま投稿できる✨\n\n😊 " + praise + "\n🌟 この調子で、次の誰かのギフト選びを助けてあげてほしい！"
    : "✅ Passed! Ready to post✨\n\n😊 " + praise + "\n🌟 Go help someone find their next gift!" };
}

// ══════════════════════════════════════════════════
// 🧩 Header / AuthGate
// ══════════════════════════════════════════════════
function NotificationBell({ t, items, panelOpen, onTogglePanel }) {
  const hasUnread = items.some(n => !n.read);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={onTogglePanel} aria-label={t.notifBellLabel} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1, color: THEME.ink }}>
        🔔
        {hasUnread && <span style={{ position: "absolute", top: "2px", right: "2px", width: "8px", height: "8px", borderRadius: "50%", background: THEME.accentRed, border: "1.5px solid " + THEME.cardBg }} />}
      </button>
      {panelOpen && (
        <div style={{ position: "absolute", top: "36px", right: 0, width: "280px", maxHeight: "360px", overflowY: "auto", background: THEME.cardBg, border: "1px solid " + THEME.line, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200 }}>
          {items.length === 0 ? (
            <p style={{ fontSize: "12px", color: THEME.textMuted, textAlign: "center", padding: "20px 12px", margin: 0 }}>{t.notifEmpty}</p>
          ) : items.map(n => (
            <div key={n.id} style={{ padding: "10px 14px", borderBottom: "1px solid " + THEME.line, fontSize: "12.5px", color: THEME.ink, background: n.read ? "transparent" : "rgba(192,138,62,0.08)" }}>
              {n.type === "comment" && <span>💬 {n.fromName}{t.notifCommentText}</span>}
              {n.type === "heart" && <span>❤️ {n.fromName}{t.notifHeartText}</span>}
              {n.type === "heart_batch" && <span>💗 {t.notifHeartBatchText}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ t, onToggleLang, isLoggedIn, notifications, onToggleNotifPanel }) {
  return (
    <header style={{ background: "#FBF8F2", borderBottom: "1px solid #D9D2C2", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Kokoron size={30} />
        <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: THEME.accentAmber, fontFamily: "'Shippori Mincho', serif", letterSpacing: "1.5px" }}>まごころ</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {isLoggedIn && <NotificationBell t={t} items={notifications.items} panelOpen={notifications.panelOpen} onTogglePanel={onToggleNotifPanel} />}
        <button onClick={onToggleLang} style={{ background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "5px 11px", borderRadius: "14px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}>{t.switchLabel}</button>
      </div>
    </header>
  );
}

function AuthGate({ t, lang, hatomono, authStep, loginId, password, recoveryQ, recoveryA, authError, isSubmitting, lastAction,
  onChangeLoginId, onChangePassword, onChangeRecoveryQ, onChangeRecoveryA, onLineLogin, onGotoSignup, onGotoLogin, onAnonStart, onSubmit, onFinalizeLogin }) {
  return (
    <div style={{ maxWidth: "420px", margin: "40px auto", padding: "24px", background: "#FBF8F2", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", textAlign: "center", animation: "fadeInUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}><Kokoron size={100} expression={hatomono} /></div>
      {authStep === "welcome" && (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 4px 0", fontFamily: lang === "ja" ? "'Shippori Mincho', serif" : "inherit", color: THEME.ink }}>{t.authTagline}</h2>
          <p style={{ fontSize: "13px", color: "#6B6F64", margin: "0 0 16px 0" }}>{t.authSubtitle}</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", textAlign: "left", background: "#EFEAE0", border: "1px solid #D9D2C2", borderRadius: "10px", padding: "10px 12px", marginBottom: "18px" }}>
            <span style={{ fontSize: "20px", flexShrink: 0 }}>🌱</span>
            <p style={{ fontSize: "11.5px", color: "#6B6F64", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{t.authGuideMsg}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button disabled style={{ width: "100%", background: "#A8D5B8", color: "#FBF8F2", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "bold", cursor: "not-allowed", opacity: 0.6, fontSize: "14px" }}>
              {isSubmitting ? t.authSubmitting : t.authLineBtn}
            </button>
            <button onClick={onGotoSignup} disabled={isSubmitting} style={{ width: "100%", background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, fontSize: "14px" }}>
              {t.authIdpassBtn}
            </button>
            <button onClick={onAnonStart} disabled={isSubmitting} style={{ width: "100%", background: "#EFEAE0", color: "#2F3B2E", border: "1px solid #D9D2C2", padding: "13px", borderRadius: "10px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, fontSize: "14px" }}>
              {t.authAnonBtn}
            </button>
            <a href="#" onClick={e => { e.preventDefault(); onGotoLogin(); }} style={{ fontSize: "12px", color: "#C08A3E", fontWeight: "bold", marginTop: "4px" }}>{t.authLoginLink}</a>
          </div>
        </div>
      )}
      {(authStep === "signup_id" || authStep === "login_id") && (
        <div style={{ textAlign: "left" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", textAlign: "center" }}>{authStep === "signup_id" ? t.authIdpassBtn : t.authLoginLink}</h3>
          {authError && <p style={{ color: "#A63446", fontSize: "12px", marginBottom: "12px", background: "#FEF2F2", padding: "8px", borderRadius: "6px" }}>⚠️ {authError}</p>}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{t.authLoginId}</label>
            <input type="text" value={loginId} onChange={e => onChangeLoginId(e.target.value)} placeholder={t.authLoginIdHint} style={{ width: "100%", padding: "10px", border: "1px solid #D9D2C2", borderRadius: "6px", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{t.authPassword}</label>
            <input type="password" value={password} onChange={e => onChangePassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSubmit(e); } }} placeholder="••••••••" style={{ width: "100%", padding: "10px", border: "1px solid #D9D2C2", borderRadius: "6px", boxSizing: "border-box" }} />
          </div>
          {authStep === "signup_id" && (
            <div style={{ marginBottom: "20px", background: "#EFEAE0", padding: "12px", borderRadius: "8px", border: "1px dashed #D9D2C2" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#6B6F64" }}>{t.authRecoveryTitle}</label>
              <p style={{ fontSize: "10px", color: "#6B6F64", margin: "0 0 8px 0" }}>{t.authRecoveryHint}</p>
              <select value={recoveryQ} onChange={e => onChangeRecoveryQ(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #D9D2C2", fontSize: "12px", marginBottom: "8px" }}>
                <option value="">{t.authRecoverySelectPh}</option>
                {(t.recoveryPresets || []).map((q, i) => <option key={i} value={q}>{q}</option>)}
              </select>
              <input type="text" value={recoveryA} onChange={e => onChangeRecoveryA(e.target.value)} placeholder={t.authRecoveryAnswer} style={{ width: "100%", padding: "8px", border: "1px solid #D9D2C2", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }} />
            </div>
          )}
          <button type="button" onClick={onSubmit} disabled={isSubmitting} style={{ width: "100%", background: isSubmitting ? "#A9C7E6" : "#C08A3E", color: "#FBF8F2", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", marginBottom: "12px" }}>
            {isSubmitting ? t.authSubmitting : authStep === "signup_id" ? t.authSubmitSignupId : t.authSubmitLoginId}
          </button>
          <div style={{ textAlign: "center", fontSize: "12px", color: "#6B6F64" }}>
            {authStep === "signup_id"
              ? <span>{t.authSwitchToLogin} <a href="#" onClick={e => { e.preventDefault(); onGotoLogin(); }} style={{ color: "#C08A3E", fontWeight: "bold" }}>{t.authLoginLink}</a></span>
              : <span>{t.authSwitchToSignup} <a href="#" onClick={e => { e.preventDefault(); onGotoSignup(); }} style={{ color: "#C08A3E", fontWeight: "bold" }}>{t.authSignupLink}</a></span>}
          </div>
        </div>
      )}
      {authStep === "success" && (
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#6B8F71", marginBottom: "8px" }}>{lastAction === "login" ? t.authKokoronWelcomeBack : t.authSuccessTitle}</h3>
          <p style={{ fontSize: "14px", color: "#6B6F64", marginBottom: "24px" }}>{lastAction === "login" ? t.authWelcomeBackBody : t.authSuccessBody}</p>
          <button onClick={onFinalizeLogin} style={{ background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "12px 32px", borderRadius: "24px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 4px 12px rgba(91,155,213,0.3)" }}>{t.authSuccessCta}</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🧩 PostCard
// ══════════════════════════════════════════════════
function countComments(list) {
  return (list || []).reduce((n, c) => n + 1 + (c.replies ? c.replies.length : 0), 0);
}

function PostCard({ t, post, distance, isFollowing, isFirstPost, onLike, onToggleFollow, onOpenQuote, onAddComment, onAddReply }) {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const isMine = post.userName === t.myName;
  const isThanks = post.postKind === "thanks";
  const p = post.parts || {};
  const cCount = countComments(post.commentList);

  const submitComment = () => {
    const v = commentInput.trim();
    if (!v) return;
    onAddComment(post.id, v);
    setCommentInput("");
    setShowComments(true);
  };
  const submitReply = (commentId) => {
    const v = replyInput.trim();
    if (!v) return;
    onAddReply(post.id, commentId, v);
    setReplyInput("");
    setReplyingTo(null);
  };

  return (
    <div className="magokoro-tag" style={{ background: "#FBF8F2", borderRadius: "14px", overflow: "hidden", border: "1px solid #D9D2C2", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", animation: "fadeInUp 0.4s ease" }}>
      {post.photoUrl && (
        <div style={{ width: "100%", height: "180px", overflow: "hidden", background: "#F0F4F8" }}>
          <img src={post.photoUrl} alt={post.giftName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.currentTarget.parentElement.style.display = "none"; }} />
        </div>
      )}
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            {post.userAvatarUrl
              ? <img src={post.userAvatarUrl} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: post.avatarColor, color: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}>{post.userAvatar}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.userName}</span>
                {isFirstPost && <span style={{ fontSize: "10.5px", color: THEME.cardBg, background: THEME.moss, padding: "2px 8px", borderRadius: "10px", fontWeight: "bold", flexShrink: 0 }}>{t.firstPostBadge}</span>}
              </div>
              <div style={{ fontSize: "10px", color: "#93958A" }}>{post.createdAt} • {post.locationName}{distance != null && <span style={{ color: "#C08A3E", marginLeft: "4px" }}>📍 {distance}{t.distanceUnit}</span>}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {!isMine && (
              <button onClick={() => onToggleFollow(post.userName)}
                style={{ fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "14px", cursor: "pointer", border: isFollowing ? "1px solid #D9D2C2" : "none", background: isFollowing ? "#EFEAE0" : "#C08A3E", color: isFollowing ? "#6B6F64" : "#FBF8F2", transition: "all 0.15s" }}>
                {isFollowing ? t.followingBtn : t.followBtn}
              </button>
            )}
            <span style={{ fontSize: "11px", background: "#EDF2F7", padding: "3px 8px", borderRadius: "4px", color: "#6B6F64", fontWeight: "500", whiteSpace: "nowrap" }}>{post.category}</span>
          </div>
        </div>

        {isThanks && <div style={{ display: "inline-block", fontSize: "11px", fontWeight: "bold", color: "#C2708E", background: "#FDEBF2", padding: "3px 10px", borderRadius: "12px", marginBottom: "10px" }}>{t.thanksLabel}</div>}

        <div style={{ display: "flex", gap: "12px", background: "#EFEAE0", padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: post.giftBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>{post.giftEmoji}</div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 2px 0" }}>{post.giftName}</h4>
            <p style={{ fontSize: "11px", color: "#6B6F64", margin: 0 }}>{t.toLabel}<span style={{ color: "#2F3B2E", fontWeight: "500" }}>{post.recipient}</span> | {post.scene}</p>
            <p style={{ fontSize: "11px", color: "#6B6F64", margin: 0 }}>{t.priceLabel}: <span style={{ color: "#E8A87C", fontWeight: "bold" }}>{post.price}</span></p>
            {post.recipientName && <p style={{ fontSize: "11px", color: "#6B6F64", margin: "2px 0 0 0" }}>🎁 {post.recipientName}</p>}
          </div>
        </div>

        {post.moodTags && post.moodTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {post.moodTags.map((tag, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "999px", border: "1px solid " + THEME.accentRed, color: THEME.accentRed, background: "rgba(166,52,70,0.08)" }}>{tag}</span>
            ))}
          </div>
        )}

        {post.quoted && (
          <div style={{ border: "1.5px solid #D8E4F0", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px", background: "#FAFCFF" }}>
            <p style={{ fontSize: "10px", fontWeight: "bold", color: "#7B94AC", margin: "0 0 4px 0" }}>{isThanks ? t.thanksLabel : t.quotedLabel} — @{post.quoted.userName}</p>
            <p style={{ fontSize: "12px", margin: 0, color: "#6B6F64" }}>{post.quoted.giftEmoji} <b>{post.quoted.giftName}</b></p>
            {post.quoted.snippet && <p style={{ fontSize: "11px", margin: "3px 0 0 0", color: "#6B6F64" }}>“{post.quoted.snippet}”</p>}
          </div>
        )}

        {(p.reason || p.reaction) && (
          <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD9A8", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
            {p.reason && (
              <p style={{ fontSize: "13px", margin: "0 0 6px 0", lineHeight: 1.6, color: "#7C4A1E" }}>
                <span style={{ fontWeight: "bold" }}>💡 {isThanks ? t.thanksReasonLabel.replace("💝 ", "") : t.cardReasonLabel}</span>
                <span style={{ color: "#B0793F" }}> — </span>{p.reason}
              </p>
            )}
            {p.reaction && (
              <p style={{ fontSize: "13px", margin: 0, lineHeight: 1.6, color: "#7C4A1E" }}>
                <span style={{ fontWeight: "bold" }}>{isThanks ? "🥰 " + t.thanksReactionLabel.replace("🥰 ", "") : "😊 " + t.cardReactionLabel}</span>
                <span style={{ color: "#B0793F" }}> — </span>{p.reaction}
              </p>
            )}
          </div>
        )}

        {p.note && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#5B7A9B", margin: "0 0 4px 0" }}>{t.cardNoteLabel}</p>
            <p style={{ fontSize: "13px", lineHeight: "1.65", margin: 0, color: "#2F3B2E", whiteSpace: "pre-line" }}>{p.note}</p>
          </div>
        )}
        {!p.note && post.review && <p style={{ fontSize: "13px", lineHeight: "1.6", margin: "0 0 12px 0", whiteSpace: "pre-line" }}>{post.review}</p>}

        {/* 🕊️ 込められた真心：あれば特別な枠で目立たせる */}
        {p.heart && (
          <div style={{ background: "linear-gradient(135deg,#FFF9F0,#FFF3E8)", border: "1.5px solid #F0D0A0", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: "bold", color: "#B0793F", margin: "0 0 4px 0" }}>🕊️ {t.cardHeartLabel}</p>
            <p style={{ fontSize: "13px", lineHeight: "1.65", margin: 0, color: "#7C4A1E", whiteSpace: "pre-line", fontStyle: "italic" }}>{p.heart}</p>
          </div>
        )}

        {/* 📦 この投稿を見て「自分も誰かに贈りたい」と思った人のための導線（DB商品と確実に一致した時だけ）。
            通販カタログ化を避けるため控えめに1行、動詞は「さがす」で統一、購入先に優劣はつけない */}
        {(() => { const dbi = findDbItemForPost(post.giftName); if (!dbi) return null;
          const { rakuten, amazon } = getPurchaseLinks(dbi);
          if (!rakuten && !amazon) return null;
          const linkStyle = { color: "#93958A", textDecoration: "underline" };
          return (
            <p style={{ textAlign: "center", fontSize: "11px", color: "#93958A", margin: "0 0 12px 0" }}>
              {rakuten && <a href={rakuten} target="_blank" rel="noopener noreferrer" style={linkStyle}>{t.searchRakuten}</a>}
              {rakuten && amazon && " ・ "}
              {amazon && <a href={amazon} target="_blank" rel="noopener noreferrer" style={linkStyle}>{t.searchAmazon}</a>}
            </p>
          );
        })()}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #EDF2F7", paddingTop: "10px", fontSize: "12px", color: "#6B6F64", flexWrap: "wrap", gap: "6px" }}>
          <button onClick={() => onLike(post.id)} style={{ background: "none", border: "none", color: post.liked ? "#A63446" : "#6B6F64", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: post.liked ? "bold" : "normal" }}>{post.liked ? "❤️" : "🤍"} {t.thanksHeartLabel}</button>
          <button onClick={() => setShowComments(s => !s)} style={{ background: "none", border: "none", color: showComments ? "#C08A3E" : "#6B6F64", cursor: "pointer", fontSize: "12px", fontWeight: showComments ? "bold" : "normal" }}>💬 {cCount}</button>
          <button onClick={() => onOpenQuote(post, "thanks")} style={{ background: "none", border: "none", color: "#C2708E", cursor: "pointer", fontSize: "12px" }}>{t.thanksBtn}</button>
          <button onClick={() => onOpenQuote(post, "quote")} style={{ background: "none", border: "none", color: "#C08A3E", cursor: "pointer", fontSize: "12px" }}>{t.quoteBtn}</button>
        </div>

        {showComments && (
          <div style={{ marginTop: "12px", background: "#EFEAE0", borderRadius: "10px", padding: "12px", animation: "fadeInUp 0.25s ease" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#6B6F64", margin: "0 0 10px 0" }}>💬 {t.commentsTitle}（{cCount}）</p>
            {(post.commentList || []).length === 0 && <p style={{ fontSize: "11px", color: "#93958A", margin: "0 0 10px 0" }}>{t.noComments}</p>}
            {(post.commentList || []).map(c => (
              <div key={c.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: c.color, color: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "11px", flexShrink: 0 }}>{c.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ background: "#FBF8F2", borderRadius: "10px", padding: "8px 10px", border: "1px solid #E9EEF4" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold" }}>{c.name}</span>
                      <span style={{ fontSize: "9px", color: "#93958A", marginLeft: "6px" }}>{c.time}</span>
                      <p style={{ fontSize: "12px", margin: "3px 0 0 0", lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                    <button onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyInput(""); }}
                      style={{ background: "none", border: "none", fontSize: "10px", color: "#C08A3E", cursor: "pointer", fontWeight: "bold", padding: "3px 4px" }}>↩ {t.replyBtn}</button>
                    {(c.replies || []).map(r => (
                      <div key={r.id} style={{ display: "flex", gap: "6px", marginTop: "6px", marginLeft: "10px" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: r.color, color: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "10px", flexShrink: 0 }}>{r.avatar}</div>
                        <div style={{ background: "#FBF8F2", borderRadius: "10px", padding: "7px 10px", border: "1px solid #E9EEF4", flex: 1 }}>
                          <span style={{ fontSize: "10px", fontWeight: "bold" }}>{r.name}</span>
                          <span style={{ fontSize: "9px", color: "#93958A", marginLeft: "6px" }}>{r.time}</span>
                          <p style={{ fontSize: "11px", margin: "2px 0 0 0", lineHeight: 1.5 }}>{r.text}</p>
                        </div>
                      </div>
                    ))}
                    {replyingTo === c.id && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px", marginLeft: "10px" }}>
                        <input type="text" value={replyInput} onChange={e => setReplyInput(e.target.value)} placeholder={t.replyPh}
                          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submitReply(c.id); } }}
                          style={{ flex: 1, padding: "7px 10px", border: "1px solid #D9D2C2", borderRadius: "14px", fontSize: "11px", outline: "none", minWidth: 0 }} />
                        <button onClick={() => submitReply(c.id)} style={{ background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "0 12px", borderRadius: "14px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>{t.commentSend}</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <input type="text" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder={t.commentPh}
                onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submitComment(); } }}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #D9D2C2", borderRadius: "16px", fontSize: "12px", outline: "none", minWidth: 0 }} />
              <button onClick={submitComment} style={{ background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "0 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.commentSend}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🧩 PostForm
// ══════════════════════════════════════════════════
function PostForm({ t, mode = "normal", quoteTarget,
  giftName, onChangeGiftName, category, categories, onChangeCategory,
  scene, scenes, onChangeScene, recipient, recipients, onChangeRecipient, price, prices, onChangePrice,
  recipientName, onChangeRecipientName, moodTags, onToggleMoodTag,
  reviewReason, reviewReaction, reviewNote, reviewHeart, onChangeReviewPart,
  combinedReview, photoUrl, onPickPhotoFile, onSamplePhoto, checkResult, hatomono, onSubmit, canSubmit }) {

  const fileInputRef = useRef(null);
  const fieldStyle = { width: "100%", padding: "10px", border: "1px solid #D9D2C2", borderRadius: "8px", fontSize: "13px", resize: "none", boxSizing: "border-box", lineHeight: 1.5, fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#374151" };
  const isOk = checkResult.status === "ok";
  const isNg = checkResult.status === "ng";
  const statusColor = isOk ? "#16A34A" : isNg ? "#DC2626" : "#D97742";
  const statusBg = isOk ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : isNg ? "linear-gradient(135deg,#FEF2F2,#FFF5F5)" : "linear-gradient(135deg,#FFF7F0,#FFFBEB)";
  const statusBorder = isOk ? "#86EFAC" : isNg ? "#FECACA" : "#FFAB76";
  const hatoFace = isOk ? "celebrate" : isNg ? "concerned" : combinedReview ? "thinking" : hatomono;
  const isThanks = mode === "thanks";
  const title = mode === "quote" ? t.quoteModeTitle : isThanks ? t.thanksModeTitle : t.modalTitle;
  const reasonLabel = isThanks ? t.thanksReasonLabel : t.reviewReasonLabel;
  const reasonPh = isThanks ? t.thanksReasonPh : t.reviewReasonPh;
  const reactionLabel = isThanks ? t.thanksReactionLabel : t.reviewReactionLabel;
  const reactionPh = isThanks ? t.thanksReactionPh : t.reviewReactionPh;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>{title}</h3>

      {quoteTarget && (
        <div style={{ border: "1.5px solid #D8E4F0", borderRadius: "10px", padding: "10px 12px", marginBottom: "14px", background: "#FAFCFF" }}>
          <p style={{ fontSize: "10px", fontWeight: "bold", color: "#7B94AC", margin: "0 0 4px 0" }}>{isThanks ? t.thanksLabel : t.quotedLabel} — @{quoteTarget.userName}</p>
          <p style={{ fontSize: "12px", margin: 0, color: "#6B6F64" }}>{quoteTarget.giftEmoji} <b>{quoteTarget.giftName}</b></p>
          {quoteTarget.snippet && <p style={{ fontSize: "11px", margin: "3px 0 0 0", color: "#6B6F64" }}>“{quoteTarget.snippet}”</p>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label style={labelStyle}>{t.giftNameLabel}</label>
          <input type="text" value={giftName} onChange={e => onChangeGiftName(e.target.value)} placeholder={t.giftNamePh} style={{ width: "100%", padding: "9px", border: "1px solid #D9D2C2", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={labelStyle}>{t.categoryLabel}</label>
          <select value={category} onChange={e => onChangeCategory(e.target.value)} style={{ width: "100%", padding: "9px", border: "1px solid #D9D2C2", borderRadius: "8px", fontSize: "13px" }}>
            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {scenes && recipients && prices && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.sceneLabel}</label>
            <select value={scene} onChange={e => onChangeScene(e.target.value)} style={{ width: "100%", padding: "7px", border: "1px solid #D9D2C2", borderRadius: "6px", fontSize: "11px" }}>
              {scenes.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.recipientLabel}</label>
            <select value={recipient} onChange={e => onChangeRecipient(e.target.value)} style={{ width: "100%", padding: "7px", border: "1px solid #D9D2C2", borderRadius: "6px", fontSize: "11px" }}>
              {recipients.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.priceLabel}</label>
            <select value={price} onChange={e => onChangePrice(e.target.value)} style={{ width: "100%", padding: "7px", border: "1px solid #D9D2C2", borderRadius: "6px", fontSize: "11px" }}>
              {prices.map((p, i) => <option key={i} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>{t.recipientNameLabel}</label>
        <input type="text" value={recipientName} onChange={e => onChangeRecipientName(e.target.value)} placeholder={t.recipientNamePh} style={{ width: "100%", padding: "9px", border: "1px solid " + THEME.line, borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>{reasonLabel}</label>
        <textarea value={reviewReason} onChange={e => onChangeReviewPart("reviewReason", e.target.value)} placeholder={reasonPh} rows={2} style={fieldStyle} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>{reactionLabel}</label>
        <textarea value={reviewReaction} onChange={e => onChangeReviewPart("reviewReaction", e.target.value)} placeholder={reactionPh} rows={2} style={fieldStyle} />
      </div>
      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>{t.reviewNoteLabel}</label>
        <textarea value={reviewNote} onChange={e => onChangeReviewPart("reviewNote", e.target.value)} placeholder={t.reviewNotePh} rows={2} style={fieldStyle} />
      </div>

      {/* 🕊️ 真心の欄：任意入力。贈り物そのものより、込めた気持ちに光を当てる */}
      <div style={{ marginBottom: "16px", background: "linear-gradient(135deg,#FFF9F0,#FFF3E8)", border: "1.5px dashed #E8B87C", borderRadius: "10px", padding: "12px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#B0793F" }}>{t.reviewHeartLabel}</label>
        <p style={{ fontSize: "11px", color: "#A0805A", margin: "0 0 8px 0", lineHeight: 1.5 }}>{t.reviewHeartHint}</p>
        <textarea value={reviewHeart} onChange={e => onChangeReviewPart("reviewHeart", e.target.value)} placeholder={t.reviewHeartPh} rows={2} style={{ ...fieldStyle, background: "#FBF8F2" }} />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>{t.moodTagsLabel}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "2px" }}>
          {t.moodTagOptions.map((tag, i) => {
            const on = moodTags.includes(tag);
            const disabled = !on && moodTags.length >= MOOD_TAGS_MAX;
            return (
              <button key={i} type="button" onClick={() => onToggleMoodTag(tag)} disabled={disabled}
                style={{ fontSize: "12px", padding: "7px 13px", borderRadius: "999px", cursor: disabled ? "default" : "pointer",
                  border: "1px solid " + (on ? THEME.accentRed : THEME.line),
                  background: on ? "rgba(166,52,70,0.08)" : THEME.cardBg,
                  color: on ? THEME.accentRed : THEME.textSecondary,
                  fontWeight: on ? "bold" : "normal", opacity: disabled ? 0.5 : 1, transition: "all 0.15s" }}>
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhotoFile} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="magokoro-tag" onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{ flex: 1, background: photoUrl ? "#F0FDF4" : "#EFEAE0", border: photoUrl ? "1.5px solid #86EFAC" : "1.5px dashed #D9D2C2", padding: "11px 14px 11px 30px", borderRadius: "10px", fontSize: "13px", cursor: "pointer", color: photoUrl ? "#16A34A" : "#6B6F64", fontWeight: "bold", textAlign: "left", transition: "all 0.2s" }}>
            {photoUrl ? t.photoSelected : t.photoBtn}
          </button>
          <button type="button" onClick={onSamplePhoto}
            style={{ background: "#EFEAE0", border: "1px solid #D9D2C2", padding: "0 12px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", color: "#6B6F64", fontWeight: "bold", flexShrink: 0 }}>
            {t.samplePhotoBtn}
          </button>
        </div>
        {photoUrl && <img src={photoUrl} alt="preview" style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "10px", marginTop: "8px", border: "1px solid #D9D2C2", animation: "fadeInUp 0.3s ease" }} />}
      </div>

      <div style={{ background: statusBg, border: "2.5px solid " + statusBorder, borderRadius: "14px", padding: "14px", marginBottom: "16px", transition: "all 0.4s ease", boxShadow: "0 2px 12px " + statusBorder + "33" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: combinedReview ? "12px" : 0, paddingBottom: combinedReview ? "10px" : 0, borderBottom: combinedReview ? "1.5px dashed " + statusBorder : "none" }}>
          <Kokoron size={46} expression={hatoFace} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: statusColor, margin: "0 0 3px 0" }}>{t.previewTitle}</p>
            <p style={{ fontSize: "11px", color: statusColor, margin: 0, whiteSpace: "pre-line", lineHeight: 1.55 }}>{checkResult.feedback || (combinedReview ? t.checkPending : t.previewEmpty)}</p>
          </div>
        </div>
        {combinedReview && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {reviewReason && (
              <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: "8px", padding: "9px" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#D97742", display: "block", marginBottom: "2px" }}>{reasonLabel}</span>
                <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.55 }}>{reviewReason}</p>
              </div>
            )}
            {reviewReaction && (
              <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: "8px", padding: "9px" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#D97742", display: "block", marginBottom: "2px" }}>{reactionLabel}</span>
                <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.55 }}>{reviewReaction}</p>
              </div>
            )}
            {reviewNote && (
              <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: "8px", padding: "9px" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#D97742", display: "block", marginBottom: "2px" }}>{t.reviewNoteLabel}</span>
                <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.55 }}>{reviewNote}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ width: "100%", background: canSubmit ? "linear-gradient(135deg,#C08A3E,#C08A3E)" : "#D9D2C2", color: "#FBF8F2", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "bold", cursor: canSubmit ? "pointer" : "not-allowed", fontSize: "14px", transition: "all 0.25s", boxShadow: canSubmit ? "0 4px 14px rgba(91,155,213,0.4)" : "none" }}>
        {t.submitBtn}
      </button>
      {combinedReview && (
        <p style={{ fontSize: "11px", color: combinedReview.length > MAX_REVIEW_LENGTH ? "#A63446" : "#93958A", textAlign: "center", margin: "8px 0 0 0" }}>
          {combinedReview.length} / {MAX_REVIEW_LENGTH}{t.charUnit}
          {combinedReview.length > MAX_REVIEW_LENGTH && t.reviewTooLong}
        </p>
      )}
      {/* 未達の理由を正しく案内する：チェックは通ったが贈り物名が空なら「名前を入れて」、それ以外はチェックを促す */}
      {!canSubmit && combinedReview && combinedReview.length <= MAX_REVIEW_LENGTH && (
        <p style={{ fontSize: "11px", color: "#93958A", textAlign: "center", margin: "8px 0 0 0" }}>
          {checkResult.status === "ok" && !giftName ? t.giftNameRequired : t.checkGateNote}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🧩 HomePanel / SearchPanel / MePanel
// ══════════════════════════════════════════════════
function HomePanel({ t, isDesktop, posts, feedMode, following, selectedCategory, postSearchQuery, userLocation, isLocating, locationNote, demoOrigin, calcDist, dispatch, A, onOpenQuote, myUid, myDisplayName }) {
  const myCommentName = myDisplayName || t.myName;
  const myCommentAvatar = myCommentName.charAt(0).toUpperCase();
  const q = postSearchQuery.trim().toLowerCase();
  // 「すべて」判定は3言語すべての語（すべて/All/전체）と現在の言語のcategories[0]で行う
  // （韓国語の「전체」が漏れると全投稿が消えてしまうため）
  const ALL_CATEGORY_WORDS = ["すべて", "All", "전체", t.categories[0]];
  const filtered = posts.filter(p => {
    if (feedMode === "following" && !following.includes(p.userName) && p.userName !== t.myName) return false;
    const mc = ALL_CATEGORY_WORDS.includes(selectedCategory) || p.category === selectedCategory;
    const body = ((p.parts && (p.parts.reason + p.parts.reaction + p.parts.note + (p.parts.heart || ""))) || p.review || "").toLowerCase();
    const mq = !q || p.giftName.toLowerCase().includes(q) || body.includes(q);
    return mc && mq;
  });

  // 🌱 「まだ届いていない投稿」（反応が少ない投稿・はじめての人の投稿）を前に出す
  // 人気順（多い順）にはしない。新着順は各バケット内でそのまま保つ
  const postCountByUid = {};
  for (const p of posts) { const key = p.uid || p.userName; postCountByUid[key] = (postCountByUid[key] || 0) + 1; }
  const isFirstPostOf = (p) => postCountByUid[p.uid || p.userName] === 1;
  const NOT_YET_REACHED_THRESHOLD = 1;
  const notYetReached = [];
  const alreadyReached = [];
  for (const p of filtered) {
    const engagement = (p.likes || 0) + countComments(p.commentList);
    (engagement <= NOT_YET_REACHED_THRESHOLD || isFirstPostOf(p) ? notYetReached : alreadyReached).push(p);
  }
  const ordered = [...notYetReached, ...alreadyReached];

  const origin = userLocation || demoOrigin;
  return (
    <div style={{ maxWidth: isDesktop ? "980px" : "600px", margin: "0 auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ background: "linear-gradient(135deg,#C08A3E 0%,#C08A3E 100%)", color: "#FBF8F2", padding: isDesktop ? "36px" : "24px", borderRadius: "18px", boxShadow: "0 6px 20px rgba(61,124,184,0.25)" }}>
        <h2 style={{ fontSize: isDesktop ? "28px" : "22px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.heroTitle}{t.heroSub}</h2>
        <p style={{ fontSize: "13px", opacity: 0.9, margin: "0 0 16px 0" }}>{t.heroDesc}</p>
        <button onClick={() => dispatch({ type: A.OPEN_POST_MODAL })} style={{ background: "#FFAB76", color: "#FBF8F2", border: "none", padding: "10px 22px", borderRadius: "22px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>{t.postBtn}</button>
      </div>
      <div style={{ background: "#FBF8F2", padding: "14px 16px", borderRadius: "12px", border: "1px solid #D9D2C2" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>{t.nearbyBtn}</span>
          <button onClick={() => dispatch({ type: A.LOCATE_REQUEST })} disabled={isLocating} style={{ background: "#EEF2F6", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", color: "#C08A3E", fontWeight: "bold" }}>{isLocating ? t.locating : t.locateBtn}</button>
        </div>
        {locationNote && <p style={{ fontSize: "12px", color: "#6B8F71", margin: "6px 0 0 0" }}>✓ {locationNote}</p>}
        {!userLocation && <p style={{ fontSize: "11px", color: "#6B6F64", margin: "6px 0 0 0" }}>💡 {t.nearbyFallbackNote}</p>}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {[["all", t.feedAll], ["following", t.feedFollowing]].map(([mode, label]) => (
          <button key={mode} onClick={() => dispatch({ type: A.SET_FEED_MODE, payload: mode })}
            style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", background: feedMode === mode ? "#C08A3E" : "#FBF8F2", color: feedMode === mode ? "#FBF8F2" : "#6B6F64", fontSize: "12px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s" }}>
            {label}{mode === "following" && following.length > 0 ? `（${following.length}）` : ""}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {t.categories.map((cat, i) => (
          <button key={i} onClick={() => dispatch({ type: A.SET_CATEGORY_FILTER, payload: cat })}
            style={{ whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "15px", border: "none", background: selectedCategory === cat ? "#C08A3E" : "#FBF8F2", color: selectedCategory === cat ? "#FBF8F2" : "#6B6F64", fontSize: "12px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s" }}>{cat}</button>
        ))}
      </div>
      <input type="text" value={postSearchQuery} onChange={e => dispatch({ type: A.SET_POST_SEARCH_QUERY, payload: e.target.value })} placeholder={t.postSearchPlaceholder}
        style={{ width: "100%", padding: "11px 14px", border: "1px solid #D9D2C2", borderRadius: "12px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#FBF8F2" }} />
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#93958A" }}>
          <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 4px 0" }}>{feedMode === "following" && following.length === 0 ? t.feedFollowingEmpty : t.noMatchTitle}</p>
          {!(feedMode === "following" && following.length === 0) && <p style={{ fontSize: "12px", margin: 0 }}>{t.noMatchDesc}</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: "16px", alignItems: "start" }}>
          {ordered.map(post => (
            <PostCard key={post.id} t={t} post={post}
              distance={calcDist(origin.lat, origin.lng, post.lat, post.lng)}
              isFollowing={following.includes(post.userName)}
              isFirstPost={isFirstPostOf(post)}
              onLike={async (id) => {
                    dispatch({ type: A.TOGGLE_LIKE, payload: id });
                    if (!id.startsWith("optimistic_")) {
                      await postService.toggleLike(id, myUid || "anon", post.liked);
                      if (!post.liked && post.uid && post.uid !== myUid) notificationService.notifyHeart(post.uid, t.myName);
                    }
                  }}
              onToggleFollow={name => dispatch({ type: A.TOGGLE_FOLLOW, payload: name })}
              onOpenQuote={onOpenQuote}
              onAddComment={(postId, text) => {
                    const comment = { id: "c" + Date.now(), name: myCommentName, avatar: myCommentAvatar, color: "#C08A3E", text, time: t.justNow, replies: [] };
                    dispatch({ type: A.ADD_COMMENT, payload: { postId, comment } });
                    if (!postId.startsWith("optimistic_")) {
                      postService.addComment(postId, comment);
                      if (post.uid && post.uid !== myUid) notificationService.notifyComment(post.uid, myCommentName);
                    }
                  }}
              onAddReply={(postId, commentId, text) => {
                    const reply = { id: "r" + Date.now(), name: myCommentName, avatar: myCommentAvatar, color: "#C08A3E", text, time: t.justNow };
                    dispatch({ type: A.ADD_REPLY, payload: { postId, commentId, reply } });
                    if (!postId.startsWith("optimistic_")) {
                      postService.addReply(postId, commentId, reply);
                      if (post.uid && post.uid !== myUid) notificationService.notifyComment(post.uid, myCommentName);
                    }
                  }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchPanel({ t, isDesktop, hatomono, isHatoTalking, chatLog, chatInput, isSending, isWebSearching, sessions, activeId, showHistory, dbSearchQuery, onSendChat, onChatKeyDown, dispatch, A }) {
  const logRef = useRef(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [chatLog, isSending]);
  return (
    <div style={{ maxWidth: isDesktop ? "760px" : "600px", margin: "0 auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#FBF8F2", borderRadius: "16px", padding: "16px", border: "1px solid #D9D2C2" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px dashed #D9D2C2" }}>
          <Kokoron size={92} expression={hatomono} isTalking={isHatoTalking} />
          <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "6px 0 0 0" }}>🌱 {t.chatTitle}</h3>
          <p style={{ fontSize: "10px", color: "#93958A", margin: 0, textAlign: "center" }}>{t.chatSub}</p>
        </div>
        {/* 🗂️ チャット履歴バー：新規作成と過去チャットの切替 */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          <button onClick={() => dispatch({ type: A.CHAT_NEW_SESSION })} style={{ flex: 1, background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.chatNewBtn}</button>
          <button onClick={() => dispatch({ type: A.CHAT_TOGGLE_HISTORY })} style={{ flex: 1, background: showHistory ? "#C08A3E" : "#EFEAE0", color: showHistory ? "#FBF8F2" : "#6B6F64", border: "none", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.chatHistoryBtn}（{sessions.length}）</button>
        </div>
        {showHistory && (
          <div style={{ background: "#EFEAE0", border: "1px solid #D9D2C2", borderRadius: "10px", padding: "8px", marginBottom: "10px", maxHeight: "170px", overflowY: "auto", animation: "fadeInUp 0.2s ease" }}>
            {sessions.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 6px", borderRadius: "8px", background: s.id === activeId ? "#E3EEF9" : "transparent" }}>
                <button onClick={() => dispatch({ type: A.CHAT_SWITCH_SESSION, payload: s.id })} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#2F3B2E", fontWeight: s.id === activeId ? "bold" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "5px 2px" }}>💬 {s.title}</button>
                <button onClick={() => dispatch({ type: A.CHAT_DELETE_SESSION, payload: s.id })} style={{ background: "none", border: "none", color: "#93958A", cursor: "pointer", fontSize: "13px", flexShrink: 0, padding: "2px 4px" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div ref={logRef} style={{ height: "450px", overflowY: "auto", background: "#EFEAE0", borderRadius: "12px", border: "1px solid #D9D2C2", padding: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {chatLog.map((m, i) =>
            m.sender === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#C08A3E", color: "#FBF8F2", padding: "10px 12px", borderRadius: "14px 14px 4px 14px", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-line", animation: "fadeInUp 0.25s ease" }}>{m.text}</div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", display: "flex", gap: "8px", maxWidth: "88%", animation: "fadeInUp 0.25s ease" }}>
                <div style={{ flexShrink: 0, marginTop: "2px" }}><Kokoron size={30} expression={m.expression || "idle"} /></div>
                <div style={{ background: "#EEF6FC", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-line", color: "#2F3B2E", wordBreak: "break-word" }}>{renderChatText(m.text)}</div>
              </div>
            )
          )}
          {isSending && (
            <div style={{ alignSelf: "flex-start", display: "flex", gap: "8px" }}>
              <div style={{ flexShrink: 0, marginTop: "2px" }}><Kokoron size={30} expression="thinking" /></div>
              <div style={{ background: "#EEF6FC", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12px", color: "#93958A", fontStyle: "italic" }}>{isWebSearching ? t.chatSearchingWeb : t.chatThinking}</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {t.quickExamples.map((ex, i) => (
            <button key={i} onClick={() => dispatch({ type: A.SET_CHAT_INPUT, payload: ex })} style={{ background: "#EFEAE0", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", color: "#6B6F64", cursor: "pointer" }}>💡 {ex}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input type="text" value={chatInput}
            onChange={e => dispatch({ type: A.SET_CHAT_INPUT, payload: e.target.value })}
            onKeyDown={onChatKeyDown}
            placeholder={t.chatPlaceholder}
            style={{ flex: 1, padding: "11px 14px", border: "1px solid #D9D2C2", borderRadius: "24px", fontSize: "13px", outline: "none", minWidth: 0 }} />
          <button onClick={onSendChat} disabled={isSending || !chatInput.trim()}
            style={{ background: (isSending || !chatInput.trim()) ? "#A9C7E6" : "#C08A3E", color: "#FBF8F2", border: "none", padding: "0 18px", borderRadius: "24px", fontWeight: "bold", cursor: (isSending || !chatInput.trim()) ? "not-allowed" : "pointer", fontSize: "14px", transition: "background 0.2s", flexShrink: 0 }}>➔</button>
        </div>
      </div>
    </div>
  );
}

function GiftPanel({ t, isDesktop, dbSearchQuery, dispatch, A }) {
  return (
    <div style={{ maxWidth: isDesktop ? "760px" : "600px", margin: "0 auto", padding: "16px" }}>
      <div style={{ background: "#FBF8F2", borderRadius: "16px", padding: "16px", border: "1px solid #D9D2C2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <span style={{ fontSize: "22px" }}>🎁</span>
          <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>{t.dbTitle}</h3>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#93958A", background: "#EFEAE0", padding: "2px 8px", borderRadius: "20px" }}>{SOUVENIR_DB.length}{t.itemsUnit}</span>
        </div>
        <input type="text" value={dbSearchQuery} onChange={e => dispatch({ type: A.SET_DB_SEARCH_QUERY, payload: e.target.value })} placeholder={t.dbSearchPlaceholder}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #D9D2C2", borderRadius: "8px", fontSize: "12px", outline: "none", marginBottom: "6px", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "linear-gradient(135deg,#FFF9F0,#FFF3E8)", border: "1px solid #F0D0A0", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px" }}>
          <Kokoron size={42} expression="happy" />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "11.5px", color: "#7C4A1E", margin: 0, lineHeight: 1.6, fontWeight: "bold" }}>{t.otoriyoseNote}</p>
            <p style={{ fontSize: "9.5px", color: "#B99B78", margin: "3px 0 0 0" }}>{t.otoriyoseAd}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
          {["全て", ...SOUVENIR_REGIONS].slice(0, 10).map(r => (
            <button key={r} onClick={() => dispatch({ type: A.SET_DB_SEARCH_QUERY, payload: r === "全て" ? "" : r })}
              style={{ background: dbSearchQuery === r || (r === "全て" && !dbSearchQuery) ? "#C08A3E" : "#EFEAE0", color: dbSearchQuery === r || (r === "全て" && !dbSearchQuery) ? "#FBF8F2" : "#6B6F64", border: "none", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontWeight: "bold", transition: "all 0.15s" }}>
              {/* 「全て」だけUI語なので現在の言語に翻訳表示。地名は固有名詞なのでそのまま */}
              {r === "全て" ? t.categories[0] : r}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: "10px" }}>
          {(dbSearchQuery.trim() ? matchSouvenirs(dbSearchQuery) : SOUVENIR_DB).length === 0 ? (
            <p style={{ fontSize: "12px", color: "#93958A", textAlign: "center", padding: "12px 0", gridColumn: "1 / -1" }}>{t.dbSearchNoMatch}</p>
          ) : (
            (dbSearchQuery.trim() ? matchSouvenirs(dbSearchQuery) : SOUVENIR_DB).map(s => (
              <div key={s.id} style={{ padding: "10px", background: "#EFEAE0", borderRadius: "10px", border: "1px solid #D9D2C2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: 0 }}>
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{s.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1A3A5C" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "#6B6F64" }}>{s.shop}</div>
                      <div style={{ fontSize: "11px", color: "#93958A" }}>{s.region}{s.contents ? "・" + s.contents : ""}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "10px", background: "#FFAB76", color: "#FBF8F2", padding: "2px 6px", borderRadius: "4px" }}>{s.category}</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#E8A87C" }}>{s.price}</span>
                    {s.kcalNote && <span style={{ fontSize: "10px", color: "#16A34A", background: "#F0FDF4", padding: "1px 5px", borderRadius: "4px" }}>🔥{s.kcalNote}</span>}
                  </div>
                </div>
                {/* 📦 お取り寄せ導線：楽天→Amazonの順、同じ見た目のボタンで優劣をつけない（AFFILIATEにIDを入れると自動で反映） */}
                {(() => {
                  const { rakuten, amazon } = getPurchaseLinks(s);
                  if (!rakuten && !amazon) return null;
                  const btnStyle = { flex: 1, textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#6B4A2E", background: "#FBF8F2", border: "1px solid " + THEME.line, borderRadius: "6px", padding: "6px 0", textDecoration: "none" };
                  return (
                    <div style={{ marginTop: "8px" }}>
                      <p style={{ fontSize: "10.5px", color: "#93958A", fontWeight: "bold", margin: "0 0 5px 0" }}>{t.otoriyoseHeading}</p>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {rakuten && <a href={rakuten} target="_blank" rel="noopener noreferrer" style={btnStyle}>{t.searchRakuten}</a>}
                        {amazon && <a href={amazon} target="_blank" rel="noopener noreferrer" style={btnStyle}>{t.searchAmazon}</a>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))
          )}
        </div>
        <p style={{ fontSize: "10.5px", color: "#93958A", textAlign: "center", margin: "14px 0 0 0" }}>{t.otoriyoseAd}</p>
      </div>
    </div>
  );
}

function MePanel({ t, loginId, displayName, avatarUrl, followingCount, onLogout, onSaveDisplayName, onSaveAvatar }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName || loginId || "");
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarNote, setAvatarNote] = useState("");
  const isGuest = (loginId || "").startsWith("guest_");
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setSaving(true);
    const ok = await onSaveDisplayName(trimmed);
    setSaving(false);
    if (ok) { setEditingName(false); setSaveNote(t.myNameSaved); setTimeout(() => setSaveNote(""), 2000); }
    else { setSaveNote(t.myNameSaveError); }
  };

  const handlePickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setAvatarSaving(true);
    setAvatarNote("");
    try {
      const dataUrl = await resizeImageFile(file, 200, 0.8);
      const ok = await onSaveAvatar(dataUrl);
      setAvatarNote(ok ? t.myNameSaved : t.myNameSaveError);
    } catch (_) {
      setAvatarNote(t.myAvatarError);
    }
    setAvatarSaving(false);
    setTimeout(() => setAvatarNote(""), 2500);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
      <div style={{ background: "#FBF8F2", borderRadius: "16px", padding: "24px", border: "1px solid #D9D2C2", textAlign: "center" }}>
        <div style={{ position: "relative", width: "64px", margin: "0 auto 12px auto" }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#C08A3E,#C08A3E)", color: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold" }}>{(displayName || t.myAvatar || "?").charAt(0)}</div>}
          {!isGuest && (
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={avatarSaving} title={t.myEditAvatar}
              style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "24px", height: "24px", borderRadius: "50%", background: "#C08A3E", border: "2px solid #FBF8F2", color: "#FBF8F2", fontSize: "11px", cursor: avatarSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              {avatarSaving ? "…" : "📷"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickAvatar} style={{ display: "none" }} />
        </div>
        {isGuest && <p style={{ fontSize: "10.5px", color: "#93958A", margin: "0 0 4px 0" }}>{t.myGuestAvatarNote}</p>}
        {avatarNote && <p style={{ fontSize: "11px", color: avatarNote === t.myNameSaved ? "#16A34A" : "#A63446", margin: "0 0 8px 0" }}>{avatarNote}</p>}

        {editingName ? (
          <div style={{ maxWidth: "260px", margin: "0 auto 8px auto" }}>
            <input value={nameDraft} onChange={e => setNameDraft(e.target.value.slice(0, 20))} maxLength={20}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #D9D2C2", borderRadius: "8px", fontSize: "15px", textAlign: "center", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "6px", marginTop: "8px", justifyContent: "center" }}>
              <button onClick={handleSave} disabled={saving || !nameDraft.trim()} style={{ background: "#C08A3E", color: "#FBF8F2", border: "none", padding: "6px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? t.mySaving : t.mySave}
              </button>
              <button onClick={() => { setEditingName(false); setNameDraft(displayName || loginId || ""); }} style={{ background: "#EFEAE0", color: "#6B6F64", border: "none", padding: "6px 16px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                {t.myCancel}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "4px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{displayName || loginId || t.myName}</h3>
            {!isGuest && <button onClick={() => setEditingName(true)} title={t.myEditName} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", opacity: 0.6 }}>✏️</button>}
          </div>
        )}
        {isGuest && !editingName && <p style={{ fontSize: "10.5px", color: "#93958A", margin: "0 0 4px 0" }}>{t.myGuestNameNote}</p>}
        {saveNote && <p style={{ fontSize: "11px", color: saveNote === t.myNameSaved ? "#16A34A" : "#A63446", margin: "0 0 4px 0" }}>{saveNote}</p>}

        <p style={{ fontSize: "12px", color: "#6B6F64", margin: "0 0 6px 0" }}>{t.memberIdLabel} {loginId || "LINE_USER_4592"}</p>
        <p style={{ fontSize: "12px", color: "#C08A3E", fontWeight: "bold", margin: "0 0 24px 0" }}>👥 {t.followingCountLabel}: {followingCount}</p>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid #A63446", color: "#A63446", padding: "8px 24px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>{t.authLogout}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🧠 Reducer / authService / レスポンシブフック
// ══════════════════════════════════════════════════
const A = {
  SET_LANG: "SET_LANG", SET_NAV: "SET_NAV",
  AUTH_GOTO_STEP: "AUTH_GOTO_STEP", AUTH_SET_LOGIN_ID: "AUTH_SET_LOGIN_ID", AUTH_SET_PASSWORD: "AUTH_SET_PASSWORD",
  AUTH_SET_RECOVERY_Q: "AUTH_SET_RECOVERY_Q", AUTH_SET_RECOVERY_A: "AUTH_SET_RECOVERY_A",
  AUTH_SUBMIT_START: "AUTH_SUBMIT_START", AUTH_SUBMIT_ERROR: "AUTH_SUBMIT_ERROR",
  AUTH_SUBMIT_SUCCESS: "AUTH_SUBMIT_SUCCESS", AUTH_LINE_LOGIN_SUCCESS: "AUTH_LINE_LOGIN_SUCCESS",
  AUTH_UPDATE_DISPLAY_NAME: "AUTH_UPDATE_DISPLAY_NAME",
  AUTH_UPDATE_AVATAR: "AUTH_UPDATE_AVATAR",
  AUTH_FINALIZE: "AUTH_FINALIZE", AUTH_LOGOUT: "AUTH_LOGOUT", SESSION_CHECK_DONE: "SESSION_CHECK_DONE",
  SET_TIMELINE: "SET_TIMELINE",
  SET_CATEGORY_FILTER: "SET_CATEGORY_FILTER", SET_POST_SEARCH_QUERY: "SET_POST_SEARCH_QUERY",
  SET_DB_SEARCH_QUERY: "SET_DB_SEARCH_QUERY", TOGGLE_LIKE: "TOGGLE_LIKE", SUBMIT_POST_SUCCESS: "SUBMIT_POST_SUCCESS",
  SET_FEED_MODE: "SET_FEED_MODE", TOGGLE_FOLLOW: "TOGGLE_FOLLOW",
  ADD_COMMENT: "ADD_COMMENT", ADD_REPLY: "ADD_REPLY",
  LOCATE_REQUEST: "LOCATE_REQUEST", LOCATE_SUCCESS: "LOCATE_SUCCESS", CLEAR_LOCATION_NOTE: "CLEAR_LOCATION_NOTE",
  SET_CHAT_INPUT: "SET_CHAT_INPUT", SEND_CHAT_START: "SEND_CHAT_START", SET_WEB_SEARCHING: "SET_WEB_SEARCHING",
  SEND_CHAT_SUCCESS: "SEND_CHAT_SUCCESS", SEND_CHAT_ERROR: "SEND_CHAT_ERROR",
  CHAT_NEW_SESSION: "CHAT_NEW_SESSION", CHAT_SWITCH_SESSION: "CHAT_SWITCH_SESSION",
  CHAT_TOGGLE_HISTORY: "CHAT_TOGGLE_HISTORY", CHAT_DELETE_SESSION: "CHAT_DELETE_SESSION",
  SET_POST_FIELD: "SET_POST_FIELD", SET_REVIEW_PART: "SET_REVIEW_PART", SELECT_PHOTO: "SELECT_PHOTO",
  OPEN_POST_MODAL: "OPEN_POST_MODAL", OPEN_QUOTE_MODAL: "OPEN_QUOTE_MODAL", CLOSE_POST_MODAL: "CLOSE_POST_MODAL",
  TOGGLE_MOOD_TAG: "TOGGLE_MOOD_TAG",
  SET_NOTIFICATIONS: "SET_NOTIFICATIONS", TOGGLE_NOTIFICATIONS_PANEL: "TOGGLE_NOTIFICATIONS_PANEL",
};

// 「どんな気持ちで贈りましたか」タグは各LANGブロックのmoodTagOptionsに定義（最大2つ・完全に任意）
const MOOD_TAGS_MAX = 2;

// 💬 チャットセッション（Claude/Gemini式の履歴管理）
// v2: こころんへのリブランドで文言が変わったため、キーを変えて古いキャッシュ（旧ここりす文言）を破棄する
const CHAT_STORAGE_KEY = "magokoro_chat_sessions_v2";
const APP_STORAGE_KEY = "magokoro_app_state";
// 投稿はFirestoreで管理するためAPP_STORAGE_KEYは不要
function makeChatSession(lang) {
  return { id: "cs" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: LANG[lang].chatDefaultTitle, log: [{ sender: "hato", text: LANG[lang].chatWelcome, expression: "happy" }], context: { lastRegion: null }, createdAt: Date.now() };
}
const _initialChatSession = makeChatSession("ja");

const initialState = {
  ui: { lang: "ja", currentNav: "home" },
  auth: { isLoggedIn: false, isCheckingSession: true, isSubmitting: false, step: "welcome", lastAction: null, loginId: "", password: "", recoveryQ: "", recoveryA: "", error: "", currentUser: null },
  posts: { items: POSTS_JA, selectedCategory: "すべて", searchQuery: "", feedMode: "all" },
  social: { following: ["Haruka_M"] },
  location: { userLocation: null, isLocating: false, note: "" },
  kokoron: { expression: "idle", isTalking: false },
  chat: { input: "", sessions: [_initialChatSession], activeId: _initialChatSession.id, isSending: false, isWebSearching: false, showHistory: false },
  db: { searchQuery: "" },
  postForm: { modalOpen: false, mode: "normal", quoteTarget: null, giftName: "", category: LANG.ja.categories[1], reviewReason: "", reviewReaction: "", reviewNote: "", reviewHeart: "", scene: "", recipient: "", recipientName: "", moodTags: [], price: "", photoUrl: null, checkResult: { status: "pending", feedback: "" } },
  notifications: { items: [], panelOpen: false },
};

// 起動時：保存済みチャット履歴があれば復元（プレビュー等で使えない環境では初期状態）
function loadPersistedState() {
  let st = initialState;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.sessions) && d.sessions.length > 0) {
        const activeId = d.sessions.some(s => s.id === d.activeId) ? d.activeId : d.sessions[0].id;
        st = { ...st, chat: { ...st.chat, sessions: d.sessions, activeId } };
      }
    }
  } catch (_) { /* 壊れたデータや未対応環境は初期状態で開始 */ }
  try {
    const raw2 = localStorage.getItem(APP_STORAGE_KEY);
    if (raw2) {
      const d2 = JSON.parse(raw2);
        if (d2 && Array.isArray(d2.following)) st = { ...st, social: { following: d2.following } };
    }
  } catch (_) { /* noop */ }
  return st;
}

function reducer(state, action) {
  switch (action.type) {
    case A.SET_LANG: {
      const l = action.payload;
      // フォロー関係は言語に依存しないので、言語切替でリセットしない（以前は消えていた）
      return { ...state, ui: { ...state.ui, lang: l },
        posts: { ...state.posts, selectedCategory: LANG[l].categories[0], feedMode: "all" },
        postForm: { ...state.postForm, category: LANG[l].categories[1], moodTags: [], checkResult: kokoronCheck([state.postForm.reviewReason, state.postForm.reviewReaction, state.postForm.reviewNote].filter(Boolean).join("\n"), l) },
        chat: { ...state.chat, input: "", isSending: false, isWebSearching: false, showHistory: false } };
    }
    case A.SET_NAV: return { ...state, ui: { ...state.ui, currentNav: action.payload } };
    case A.AUTH_GOTO_STEP: return { ...state, auth: { ...state.auth, step: action.payload, error: "", lastAction: action.payload === "signup_id" ? "signup" : action.payload === "login_id" ? "login" : state.auth.lastAction } };
    case A.AUTH_SET_LOGIN_ID: return { ...state, auth: { ...state.auth, loginId: action.payload } };
    case A.AUTH_SET_PASSWORD: return { ...state, auth: { ...state.auth, password: action.payload } };
    case A.AUTH_SET_RECOVERY_Q: return { ...state, auth: { ...state.auth, recoveryQ: action.payload } };
    case A.AUTH_SET_RECOVERY_A: return { ...state, auth: { ...state.auth, recoveryA: action.payload } };
    case A.AUTH_SUBMIT_START: return { ...state, auth: { ...state.auth, isSubmitting: true, error: "" } };
    case A.AUTH_SUBMIT_ERROR: return { ...state, auth: { ...state.auth, isSubmitting: false, error: action.payload.message, password: action.payload.clearPassword ? "" : state.auth.password }, kokoron: { ...state.kokoron, expression: "concerned" } };
    case A.AUTH_SUBMIT_SUCCESS: return { ...state, auth: { ...state.auth, isSubmitting: false, error: "", step: "success", password: "", currentUser: action.payload.user }, kokoron: { ...state.kokoron, expression: "celebrate" } };
    case A.AUTH_UPDATE_DISPLAY_NAME: return { ...state, auth: { ...state.auth, currentUser: { ...state.auth.currentUser, displayName: action.payload } } };
    case A.AUTH_UPDATE_AVATAR: return { ...state, auth: { ...state.auth, currentUser: { ...state.auth.currentUser, avatarUrl: action.payload } } };
    case A.AUTH_LINE_LOGIN_SUCCESS: return { ...state, auth: { ...state.auth, isSubmitting: false, isLoggedIn: true, currentUser: action.payload, error: "" }, ui: { ...state.ui, currentNav: "home" }, kokoron: { ...state.kokoron, expression: "happy" } };
    case A.AUTH_FINALIZE: return { ...state, auth: { ...state.auth, isLoggedIn: true }, ui: { ...state.ui, currentNav: "home" }, kokoron: { ...state.kokoron, expression: "idle" } };
    case A.AUTH_LOGOUT: return { ...state, auth: { ...state.auth, isLoggedIn: false, step: "welcome", currentUser: null, lastAction: null, loginId: "", password: "" }, kokoron: { ...state.kokoron, expression: "idle" } };
    case A.SESSION_CHECK_DONE: return { ...state, auth: { ...state.auth, isCheckingSession: false, isLoggedIn: !!action.payload, currentUser: action.payload || null } };
    case A.SET_TIMELINE:
      return { ...state, posts: { ...state.posts, items: action.payload } };
    case A.SET_CATEGORY_FILTER: return { ...state, posts: { ...state.posts, selectedCategory: action.payload } };
    case A.SET_POST_SEARCH_QUERY: return { ...state, posts: { ...state.posts, searchQuery: action.payload } };
    case A.SET_DB_SEARCH_QUERY: return { ...state, db: { ...state.db, searchQuery: action.payload } };
    case A.SET_FEED_MODE: return { ...state, posts: { ...state.posts, feedMode: action.payload } };
    case A.TOGGLE_FOLLOW: {
      const name = action.payload;
      const f = state.social.following;
      return { ...state, social: { following: f.includes(name) ? f.filter(n => n !== name) : [...f, name] } };
    }
    case A.TOGGLE_LIKE: return { ...state, posts: { ...state.posts, items: state.posts.items.map(p => p.id === action.payload ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p) } };
    case A.ADD_COMMENT: {
      // comment（新規コメントの完全なオブジェクト）は呼び出し側（Firestoreへの永続化と共通化するため）で生成する
      const { postId, comment } = action.payload;
      return { ...state, posts: { ...state.posts, items: state.posts.items.map(p => p.id === postId ? { ...p, commentList: [...(p.commentList || []), comment] } : p) } };
    }
    case A.ADD_REPLY: {
      const { postId, commentId, reply } = action.payload;
      return { ...state, posts: { ...state.posts, items: state.posts.items.map(p => p.id !== postId ? p : { ...p, commentList: (p.commentList || []).map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c) }) } };
    }
    case A.SUBMIT_POST_SUCCESS: return { ...state,
      posts: { ...state.posts, items: [action.payload, ...state.posts.items] },
      postForm: { ...state.postForm, modalOpen: false, mode: "normal", quoteTarget: null, giftName: "", category: LANG[state.ui.lang].categories[1], reviewReason: "", reviewReaction: "", reviewNote: "", reviewHeart: "", recipientName: "", moodTags: [], photoUrl: null, checkResult: { status: "pending", feedback: "" } },
      ui: { ...state.ui, currentNav: "home" },
      kokoron: { ...state.kokoron, expression: "celebrate" } };
    case A.LOCATE_REQUEST: return { ...state, location: { ...state.location, isLocating: true }, kokoron: { ...state.kokoron, expression: "thinking" } };
    case A.LOCATE_SUCCESS: return { ...state, location: { userLocation: action.payload, isLocating: false, note: LANG[state.ui.lang].locationSetNote }, kokoron: { ...state.kokoron, expression: "happy" } };
    case A.CLEAR_LOCATION_NOTE: return { ...state, location: { ...state.location, note: "" } };
    case A.SET_CHAT_INPUT: return { ...state, chat: { ...state.chat, input: action.payload } };
    case A.SEND_CHAT_START: {
      const { sessionId, text } = action.payload;
      return { ...state,
        chat: { ...state.chat, input: "", isSending: true, isWebSearching: false, showHistory: false,
          sessions: state.chat.sessions.map(s => s.id !== sessionId ? s : { ...s,
            title: s.log.some(m => m.sender === "user") ? s.title : (text.length > 16 ? text.slice(0, 16) + "…" : text),
            log: [...s.log, { sender: "user", text }] }) },
        kokoron: { expression: "thinking", isTalking: true } };
    }
    case A.SET_WEB_SEARCHING: return { ...state, chat: { ...state.chat, isWebSearching: true } };
    case A.SEND_CHAT_SUCCESS: {
      const { sessionId, text, expression, context } = action.payload;
      return { ...state,
        chat: { ...state.chat, isSending: false, isWebSearching: false,
          sessions: state.chat.sessions.map(s => s.id !== sessionId ? s : { ...s, log: [...s.log, { sender: "hato", text, expression }], context: context || s.context }) },
        kokoron: { expression: expression || "happy", isTalking: false } };
    }
    case A.SEND_CHAT_ERROR: {
      const { sessionId, text } = action.payload;
      return { ...state,
        chat: { ...state.chat, isSending: false, isWebSearching: false,
          sessions: state.chat.sessions.map(s => s.id !== sessionId ? s : { ...s, log: [...s.log, { sender: "hato", text, expression: "sad" }] }) },
        kokoron: { expression: "sad", isTalking: false } };
    }
    case A.CHAT_NEW_SESSION: {
      const ns = makeChatSession(state.ui.lang);
      return { ...state, chat: { ...state.chat, sessions: [ns, ...state.chat.sessions], activeId: ns.id, input: "", showHistory: false } };
    }
    case A.CHAT_SWITCH_SESSION: return { ...state, chat: { ...state.chat, activeId: action.payload, showHistory: false } };
    case A.CHAT_TOGGLE_HISTORY: return { ...state, chat: { ...state.chat, showHistory: !state.chat.showHistory } };
    case A.CHAT_DELETE_SESSION: {
      let rest = state.chat.sessions.filter(s => s.id !== action.payload);
      if (rest.length === 0) rest = [makeChatSession(state.ui.lang)];
      const nextActive = state.chat.activeId === action.payload ? rest[0].id : state.chat.activeId;
      return { ...state, chat: { ...state.chat, sessions: rest, activeId: nextActive } };
    }
    case A.SET_POST_FIELD: return { ...state, postForm: { ...state.postForm, [action.payload.field]: action.payload.value } };
    case A.SET_REVIEW_PART: {
      const next = { ...state.postForm, [action.payload.field]: action.payload.value };
      const combined = [next.reviewReason, next.reviewReaction, next.reviewNote].filter(Boolean).join("\n");
      return { ...state, postForm: { ...next, checkResult: kokoronCheck(combined, state.ui.lang) } };
    }
    case A.SELECT_PHOTO: return { ...state, postForm: { ...state.postForm, photoUrl: action.payload } };
    case A.TOGGLE_MOOD_TAG: {
      const tag = action.payload;
      const current = state.postForm.moodTags;
      const isOn = current.includes(tag);
      const next = isOn ? current.filter(x => x !== tag) : (current.length < MOOD_TAGS_MAX ? [...current, tag] : current);
      return { ...state, postForm: { ...state.postForm, moodTags: next } };
    }
    case A.SET_NOTIFICATIONS: return { ...state, notifications: { ...state.notifications, items: action.payload } };
    case A.TOGGLE_NOTIFICATIONS_PANEL: return { ...state, notifications: { ...state.notifications, panelOpen: !state.notifications.panelOpen } };
    case A.OPEN_POST_MODAL: return { ...state, postForm: { ...state.postForm, modalOpen: true, mode: "normal", quoteTarget: null } };
    case A.OPEN_QUOTE_MODAL: return { ...state, postForm: { ...state.postForm, modalOpen: true, mode: action.payload.kind, quoteTarget: action.payload.quoted, giftName: action.payload.kind === "thanks" ? action.payload.quoted.giftName : state.postForm.giftName } };
    case A.CLOSE_POST_MODAL: return { ...state, postForm: { ...state.postForm, modalOpen: false, mode: "normal", quoteTarget: null } };
    default: return state;
  }
}


// ══════════════════════════════════════════════════════════════════
// 🔐 authService（ID/パスワード認証 + Firebase匿名セッション併用）
// ── 設計方針 ────────────────────────────────────────────────────
//   1. ログインIDとパスワードは Firestore の users/{loginId} に保存
//      （パスワードは平文で保存せず SHA-256 でハッシュ化してから保存）
//   2. signup/login どちらも成功後に signInAnonymously を実行し、
//      Firestore投稿ルール（request.auth != null）を満たすセッションを作る
//   3. これにより「どの端末からでも同じID/パスワードで再ログイン」できる
//   4. 注意：本当のサーバー認証ではなくクライアント完結の簡易認証のため、
//      Firestoreルールでパスワードハッシュ自体は「読み取り不可」にはできない
//      （クライアントがログイン時に照合する必要があるため）。
//      本格的な秘匿性が必要になったら Cloud Functions 経由の認証に移行する。
// ══════════════════════════════════════════════════════════════════
async function hashPassword(password) {
  try {
    const data = new TextEncoder().encode("magokoro:" + password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    return "plain:" + password; // crypto.subtle が使えない環境向けの最終フォールバック
  }
}

// Firestoreに書き込む前に、Firebase認証セッションが生きているか確認。
// 無ければ匿名セッションを張り直す（セキュリティルールの request.auth != null を確実に満たすため）
async function ensureAuthed() {
  if (fbAuth.currentUser) return true;
  try { await signInAnonymously(fbAuth); return true; } catch (_) { return false; }
}

const authService = {
  async signup(loginId, password, recoveryQuestion, recoveryAnswer) {
    try {
      if (!(await ensureAuthed())) return { ok: false, code: "AUTH_ERROR" };
      const ref = doc(fbDb, "users", loginId);
      const existing = await getDoc(ref);
      if (existing.exists()) return { ok: false, code: "DUPLICATE_ID" };
      const passwordHash = await hashPassword(password);
      const recoveryAnswerHash = recoveryAnswer ? await hashPassword(recoveryAnswer.trim().toLowerCase()) : "";
      await setDoc(ref, { passwordHash, recoveryQuestion: recoveryQuestion || "", recoveryAnswerHash, displayName: loginId, createdAt: serverTimestamp() });
      return { ok: true, user: { uid: fbAuth.currentUser.uid, loginId, displayName: loginId } };
    } catch (e) {
      console.error("signup error:", e);
      return { ok: false, code: "AUTH_ERROR" };
    }
  },
  async login(loginId, password) {
    try {
      if (!(await ensureAuthed())) return { ok: false, code: "AUTH_ERROR" };
      const ref = doc(fbDb, "users", loginId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { ok: false, code: "INVALID_CREDENTIALS" };
      const passwordHash = await hashPassword(password);
      if (snap.data().passwordHash !== passwordHash) return { ok: false, code: "INVALID_CREDENTIALS" };
      return { ok: true, user: { uid: fbAuth.currentUser.uid, loginId, displayName: snap.data().displayName || loginId, avatarUrl: snap.data().avatarUrl || null } };
    } catch (e) {
      console.error("login error:", e);
      return { ok: false, code: "AUTH_ERROR" };
    }
  },
  async updateDisplayName(loginId, newName) {
    try {
      if (!(await ensureAuthed())) return { ok: false };
      await setDoc(doc(fbDb, "users", loginId), { displayName: newName }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error("updateDisplayName error:", e);
      return { ok: false };
    }
  },
  async updateAvatar(loginId, avatarDataUrl) {
    try {
      if (!(await ensureAuthed())) return { ok: false };
      await setDoc(doc(fbDb, "users", loginId), { avatarUrl: avatarDataUrl }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error("updateAvatar error:", e);
      return { ok: false };
    }
  },
  async logout() {
    try { await signOut(fbAuth); } catch (_) { /* noop */ }
  },
  // onAuthStateChanged を useEffect で使うため、ここではヘルパーとして提供
  subscribeAuthState(callback) {
    return onAuthStateChanged(fbAuth, callback);
  },
};

// ══════════════════════════════════════════════════════════════════
// 🗄️ postService（Firestore 投稿CRUD）
// ── 設計方針 ────────────────────────────────────────────────────
//   1. addDoc: 新規投稿を Firestore の posts コレクションに保存
//   2. onSnapshot: リアルタイム購読（誰かが投稿→全員の画面に即反映）
//   3. updateDoc + increment: いいねのカウンターをアトミックに更新
//      （複数ユーザーが同時にいいねしても競合しない）
//   4. serverTimestamp: クライアント時刻のズレを防ぐためサーバー時刻を使用
// ══════════════════════════════════════════════════════════════════
const postService = {
  async addPost(postData) {
    try {
      if (!(await ensureAuthed())) return { ok: false };
      const ref = await addDoc(collection(fbDb, "posts"), {
        ...postData,
        likes: 0,
        likedBy: [],
        comments: 0,
        createdAt: serverTimestamp(),
      });
      return { ok: true, id: ref.id };
    } catch (e) {
      console.error("Firestore addDoc error:", e);
      return { ok: false };
    }
  },
  // myUid: 閲覧者自身のuid。likedBy配列に含まれているかどうかで、この端末での「いいね済み」表示を都度算出する
  // （likedを単一の真偽値としてFirestoreに持つと、誰か一人がいいねしただけで全員の画面が「いいね済み」になってしまうため）
  subscribeTimeline(myUid, callback) {
    // 最新100件を更新日時降順でリアルタイム購読
    const q = query(collection(fbDb, "posts"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          liked: !!(myUid && (data.likedBy || []).includes(myUid)),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString("ja-JP") : "たった今",
        };
      });
      callback(items);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
    });
  },
  async toggleLike(postId, myUid, currentlyLiked) {
    try {
      if (!(await ensureAuthed())) return { ok: false };
      await updateDoc(doc(fbDb, "posts", postId), {
        likes: increment(currentlyLiked ? -1 : 1),
        likedBy: currentlyLiked ? arrayRemove(myUid) : arrayUnion(myUid),
      });
      return { ok: true };
    } catch (e) {
      console.error("Firestore updateDoc error:", e);
      return { ok: false };
    }
  },
  async addComment(postId, comment) {
    try {
      if (!(await ensureAuthed())) return { ok: false };
      await updateDoc(doc(fbDb, "posts", postId), { commentList: arrayUnion(comment) });
      return { ok: true };
    } catch (e) {
      console.error("Firestore addComment error:", e);
      return { ok: false };
    }
  },
  // replyはcommentList内の特定要素のネストした配列に追加するため、arrayUnionでは書けない。
  // 読み取り→書き込みをトランザクションにして、同時返信による上書き消失を防ぐ
  async addReply(postId, commentId, reply) {
    try {
      if (!(await ensureAuthed())) return { ok: false };
      const ref = doc(fbDb, "posts", postId);
      await runTransaction(fbDb, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const commentList = snap.data().commentList || [];
        const next = commentList.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c);
        tx.update(ref, { commentList: next });
      });
      return { ok: true };
    } catch (e) {
      console.error("Firestore addReply error:", e);
      return { ok: false };
    }
  },
};

// ══════════════════════════════════════════════════
// 🔔 通知：コメントは即時・1件ずつ／ハートは1時間に10件までは1件ずつ、
// それを超えたら1件のまとめ通知に自動切替。1時間ごとにカウントリセット。
// 「反応がありませんでした」的な通知は意図的に一切実装しない。
// ══════════════════════════════════════════════════
const HEART_NOTIFY_BATCH_THRESHOLD = 10;
const HEART_NOTIFY_WINDOW_MS = 60 * 60 * 1000;

const notificationService = {
  subscribeNotifications(myUid, callback) {
    if (!myUid) return () => {};
    const q = query(collection(fbDb, "notifications"), where("toUid", "==", myUid), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Firestore notifications onSnapshot error:", err);
    });
  },
  async notifyComment(toUid, fromName) {
    if (!toUid) return;
    try {
      if (!(await ensureAuthed())) return;
      await addDoc(collection(fbDb, "notifications"), {
        toUid, type: "comment", fromName, read: false, createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Firestore notifyComment error:", e);
    }
  },
  async notifyHeart(toUid, fromName) {
    if (!toUid) return;
    try {
      if (!(await ensureAuthed())) return;
      const counterRef = doc(fbDb, "notificationCounters", toUid);
      await runTransaction(fbDb, async (tx) => {
        const snap = await tx.get(counterRef);
        const data = snap.exists() ? snap.data() : null;
        const nowMs = Date.now();
        const windowStartMs = data?.hourWindowStart?.toMillis ? data.hourWindowStart.toMillis() : 0;
        const withinWindow = !!data && (nowMs - windowStartMs) < HEART_NOTIFY_WINDOW_MS;
        const nextCount = (withinWindow ? (data.heartCountThisHour || 0) : 0) + 1;

        if (nextCount <= HEART_NOTIFY_BATCH_THRESHOLD) {
          const notifRef = doc(collection(fbDb, "notifications"));
          tx.set(notifRef, { toUid, type: "heart", fromName, read: false, createdAt: serverTimestamp() });
          tx.set(counterRef, {
            heartCountThisHour: nextCount,
            hourWindowStart: withinWindow ? data.hourWindowStart : serverTimestamp(),
            batchNotificationId: null,
          });
        } else {
          const existingBatchId = withinWindow ? data.batchNotificationId : null;
          const batchRef = existingBatchId ? doc(fbDb, "notifications", existingBatchId) : doc(collection(fbDb, "notifications"));
          const batchPayload = {
            toUid, type: "heart_batch", count: nextCount - HEART_NOTIFY_BATCH_THRESHOLD,
            read: false, updatedAt: serverTimestamp(),
          };
          if (!existingBatchId) batchPayload.createdAt = serverTimestamp();
          tx.set(batchRef, batchPayload, { merge: true });
          tx.set(counterRef, {
            heartCountThisHour: nextCount,
            hourWindowStart: withinWindow ? data.hourWindowStart : serverTimestamp(),
            batchNotificationId: batchRef.id,
          });
        }
      });
    } catch (e) {
      console.error("Firestore notifyHeart error:", e);
    }
  },
  async markAllRead(items) {
    const unread = items.filter(n => !n.read);
    for (const n of unread) {
      try { await updateDoc(doc(fbDb, "notifications", n.id), { read: true }); }
      catch (e) { console.error("Firestore markAllRead error:", e); }
    }
  },
};


// ══════════════════════════════════════════════════════════════════
// 📦 Firebase SDK のインストール（初回のみ必要）
//    npm install firebase
//
// 🔑 Vercel 環境変数（Settings → Environment Variables）に以下を設定:
//    VITE_FB_API_KEY         = your_api_key
//    VITE_FB_AUTH_DOMAIN     = your-project.firebaseapp.com
//    VITE_FB_PROJECT_ID      = your-project-id
//    VITE_FB_STORAGE_BUCKET  = your-project.firebasestorage.app
//    VITE_FB_SENDER_ID       = your_sender_id
//    VITE_FB_APP_ID          = your_app_id
//
// 🔒 Firestore セキュリティルール（Firebaseコンソール → Firestore → ルール）:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /posts/{postId} {
//       allow read: if true;                          // 全員読み取り可
//       allow create: if request.auth != null;        // 認証済みのみ投稿可
//       allow update: if request.auth != null
//         && request.resource.data.diff(resource.data).affectedKeys()
//            .hasOnly(['likes', 'likedBy', 'commentList']); // いいね・コメント・返信の更新のみ許可
//     }
//   }
// }
// ══════════════════════════════════════════════════════════════════

export default function AgeteApp() {
  const [state, dispatch] = useReducer(reducer, null, loadPersistedState);
  const isDesktop = useIsDesktop();
  // 🌱 投稿直後のこころんリアクショントーストと、無反応時の「見てみる？」誘導
  const [postToast, setPostToast] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);

  const { lang, currentNav } = state.ui;
  const { isLoggedIn, isCheckingSession, isSubmitting, step: authStep, lastAction, loginId, password, recoveryQ, recoveryA, error: authError, currentUser } = state.auth;
  const displayName = currentUser?.displayName || loginId;
  const avatarUrl = currentUser?.avatarUrl || null;
  const { items: posts, selectedCategory, searchQuery: postSearchQuery, feedMode } = state.posts;
  const { following } = state.social;
  const { userLocation, isLocating, note: locationNote } = state.location;
  const { expression: hatomono, isTalking: isHatoTalking } = state.kokoron;
  const { input: chatInput, sessions: chatSessions, activeId: chatActiveId, isSending, isWebSearching, showHistory: chatShowHistory } = state.chat;
  const activeChat = chatSessions.find(s => s.id === chatActiveId) || chatSessions[0];
  const chatLog = activeChat.log;
  const { searchQuery: dbSearchQuery } = state.db;
  const { modalOpen, mode: formMode, quoteTarget, giftName: newGiftName, category: newPostCategory, reviewReason, reviewReaction, reviewNote, reviewHeart, scene: selectedScene, recipient: selectedRecipient, recipientName, moodTags, price: selectedPrice, photoUrl: newPhotoUrl, checkResult } = state.postForm;
  const notifications = state.notifications;

  const t = LANG[lang];

  // 最新stateをrefで参照（stale closure対策）
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── ログイン維持用：localStorageキー ──
  const AUTH_STORAGE_KEY = "magokoro_auth_user";

  // ── モバイル：スクロールスナップ ──
  const tabScrollRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const scrollDebounce = useRef(null);

  useEffect(() => {
    if (isDesktop) return;
    const el = tabScrollRef.current;
    if (!el) return;
    const target = NAV_ORDER.indexOf(currentNav) * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 2) {
      isProgrammaticScroll.current = true;
      el.scrollTo({ left: target, behavior: "smooth" });
      setTimeout(() => { isProgrammaticScroll.current = false; }, 450);
    }
  }, [currentNav, isDesktop]);

  useEffect(() => {
    if (isDesktop) return;
    const onResize = () => {
      const el = tabScrollRef.current;
      if (!el) return;
      el.scrollTo({ left: NAV_ORDER.indexOf(stateRef.current.ui.currentNav) * el.clientWidth, behavior: "auto" });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isDesktop]);

  const handleTabScroll = (e) => {
    const el = e.currentTarget;
    if (isProgrammaticScroll.current) return;
    clearTimeout(scrollDebounce.current);
    scrollDebounce.current = setTimeout(() => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      const nav = NAV_ORDER[Math.max(0, Math.min(idx, NAV_ORDER.length - 1))];
      if (nav !== stateRef.current.ui.currentNav) dispatch({ type: A.SET_NAV, payload: nav });
    }, 90);
  };

  // ── Firebase認証状態の監視（onAuthStateChangedでセッション自動復元） ──
  useEffect(() => {
    const unsub = authService.subscribeAuthState(async (fbUser) => {
      // 初回のセッション確認のときだけ復元する。
      // （ログイン失敗中やID/パスワードログイン後に、裏の認証イベントでguestに上書きされるのを防ぐ）
      if (!stateRef.current.auth.isCheckingSession) return;
      let saved = null;
      try { const raw = localStorage.getItem(AUTH_STORAGE_KEY); if (raw) saved = JSON.parse(raw); } catch (_) { /* noop */ }
      if (saved) {
        // 保存済みの本アカウント情報があっても、実際のFirebase Authセッションが生きているとは限らない
        // （キャッシュ削除やトークン失効などでfbUserがnullのまま「ログイン中」に見えると、
        //   その後ensureAuthed()が発行する匿名uidとsavedのuidが食い違ってしまう）。
        // fbUserが無ければ匿名セッションを張り直し、実際に確立できたuidで復元する。
        const uid = fbUser?.uid || (await ensureAuthed() ? fbAuth.currentUser?.uid : null);
        dispatch({ type: A.SESSION_CHECK_DONE, payload: uid ? { ...saved, uid } : null });
        return;
      }
      const payload = fbUser ? { uid: fbUser.uid, loginId: "guest_" + fbUser.uid.slice(0, 8), displayName: "ゲスト" } : null;
      dispatch({ type: A.SESSION_CHECK_DONE, payload });
    });
    return () => unsub();
  }, []);

  // ── Firestoreタイムラインのリアルタイム購読 ──────────────────────
  // 自分のuidが変わる（ログイン/ログアウト/セッション復元）たびに、いいね済み判定をやり直すため再購読する
  const myUid = currentUser?.uid || null;
  const realPostsRef = useRef([]); // Firestore由来の実投稿だけを保持（シードと分けて管理）
  const seedsForLang = (l) => (l === "ja" ? POSTS_JA : POSTS_EN); // 韓国語はまだ専用シードが無いので英語を流用
  useEffect(() => {
    const unsub = postService.subscribeTimeline(myUid, (items) => {
      // Firestoreが空のうちはシード投稿を残す（空のタイムラインで「あれ？」とならないように）
      realPostsRef.current = items;
      if (items.length > 0) {
        dispatch({ type: A.SET_TIMELINE, payload: [...items, ...seedsForLang(stateRef.current.ui.lang)] });
      }
    });
    return () => unsub();
  }, [myUid]);

  // 言語を切り替えたら、シード投稿だけ現在の言語のものに貼り直す（実投稿はそのまま保持）。
  // 以前は購読時の言語のままシードが固定され、UIとシードの言語がずれていた
  useEffect(() => {
    if (realPostsRef.current.length > 0) {
      dispatch({ type: A.SET_TIMELINE, payload: [...realPostsRef.current, ...seedsForLang(lang)] });
    }
  }, [lang]);

  // ── 通知のリアルタイム購読 ──────────────────────
  useEffect(() => {
    const unsub = notificationService.subscribeNotifications(myUid, (items) => {
      dispatch({ type: A.SET_NOTIFICATIONS, payload: items });
    });
    return () => unsub();
  }, [myUid]);

  // ── チャット履歴の保存（本番では維持・プレビューでは制限により保存されない） ──
  useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ sessions: chatSessions.slice(0, 20), activeId: chatActiveId })); } catch (_) { /* noop */ }
  }, [chatSessions, chatActiveId]);

  // 投稿はFirestoreで管理するためlocalStorage保存は不要になった

  // ── 位置情報 ──
  useEffect(() => {
    if (!isLocating) return;
    const timer = setTimeout(() => {
      dispatch({ type: A.LOCATE_SUCCESS, payload: demoOrigin });
      setTimeout(() => dispatch({ type: A.CLEAR_LOCATION_NOTE }), 3000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLocating]);

  const calcDist = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000, dL = ((lat2 - lat1) * Math.PI) / 180, dN = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dL / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dN / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, []);

  // ── 認証 ──
  // 「個人情報の入力なしで始める」ボタン：本当に匿名のまま開始する
  const handleAnonStart = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (stateRef.current.auth.isSubmitting) return;
    dispatch({ type: A.AUTH_SUBMIT_START });
    try {
      const cred = await signInAnonymously(fbAuth);
      dispatch({ type: A.AUTH_SUBMIT_SUCCESS, payload: { user: { uid: cred.user.uid, loginId: "guest_" + cred.user.uid.slice(0, 8), displayName: "ゲスト" } } });
    } catch (_) {
      dispatch({ type: A.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: false } });
    }
  };

  // ID/パスワードの新規登録・ログイン（入力内容を実際に検証する）
  const handleAuthSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cur = stateRef.current.auth;
    if (cur.isSubmitting) return;
    const id = cur.loginId.trim();
    const pw = cur.password;
    if (!id || !pw) {
      dispatch({ type: A.AUTH_SUBMIT_ERROR, payload: { message: t.authErrRequired, clearPassword: false } });
      return;
    }
    dispatch({ type: A.AUTH_SUBMIT_START });
    try {
      const result = cur.lastAction === "signup"
        ? await authService.signup(id, pw, cur.recoveryQ, cur.recoveryA)
        : await authService.login(id, pw);
      if (result.ok) {
        dispatch({ type: A.AUTH_SUBMIT_SUCCESS, payload: { user: result.user } });
      } else {
        const msg = result.code === "DUPLICATE_ID" ? t.authErrDuplicateId
          : result.code === "INVALID_CREDENTIALS" ? t.authErrInvalidCredentials
          : t.authErrNetwork;
        dispatch({ type: A.AUTH_SUBMIT_ERROR, payload: { message: msg, clearPassword: true } });
      }
    } catch (_) {
      dispatch({ type: A.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: false } });
    }
  };

  const handleLineLogin = handleAnonStart;  // 現状LINE未対応のため使用されない（ボタンはdisabled表示）

  const handleFinalizeLogin = () => {
    const user = stateRef.current.auth.currentUser;
    if (user) { try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)); } catch (_) { /* noop */ } }
    dispatch({ type: A.AUTH_FINALIZE });
  };

  // 表示名の変更：Firestore（本アカウントの永続情報）とローカルstateの両方を更新
  const handleSaveDisplayName = async (newName) => {
    const cur = stateRef.current.auth.currentUser;
    if (!cur || !cur.loginId || cur.loginId.startsWith("guest_")) return false; // 匿名ゲストは変更不可（永続先がないため）
    const result = await authService.updateDisplayName(cur.loginId, newName);
    if (result.ok) {
      dispatch({ type: A.AUTH_UPDATE_DISPLAY_NAME, payload: newName });
      try {
        const updated = { ...cur, displayName: newName };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) { /* noop */ }
    }
    return result.ok;
  };

  // プロフィール写真の保存：Firestore（本アカウントの永続情報）とローカルstateの両方を更新
  const handleSaveAvatar = async (dataUrl) => {
    const cur = stateRef.current.auth.currentUser;
    if (!cur || !cur.loginId || cur.loginId.startsWith("guest_")) return false; // 匿名ゲストは変更不可
    const result = await authService.updateAvatar(cur.loginId, dataUrl);
    if (result.ok) {
      dispatch({ type: A.AUTH_UPDATE_AVATAR, payload: dataUrl });
      try {
        const updated = { ...cur, avatarUrl: dataUrl };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) { /* noop */ }
    }
    return result.ok;
  };

  // ── 「ようこそ」画面は見せつつ、ボタンを押さなくても自動でホームへ進む ──
  // （「この内容で始める」を押した後に何も起きないように見える、というつまずきをなくすための保険）
  useEffect(() => {
    if (authStep !== "success") return;
    const timer = setTimeout(() => { handleFinalizeLogin(); }, 1400);
    return () => clearTimeout(timer);
  }, [authStep]);

  const handleLogout = async () => {
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (_) { /* noop */ }
    try { await authService.logout(); } catch (_) { /* noop */ }
    dispatch({ type: A.AUTH_LOGOUT });
  };

  // ── チャット送信（意図理解：調べ物はWebへ、おすすめはDBへ） ──
  const handleSendChat = useCallback(async () => {
    const cur = stateRef.current;
    const userMsg = cur.chat.input.trim();
    if (!userMsg || cur.chat.isSending) return;
    const session = cur.chat.sessions.find(s => s.id === cur.chat.activeId) || cur.chat.sessions[0];
    const sessionId = session.id;
    const capturedContext = { ...session.context };
    const capturedLang = cur.ui.lang;
    const ja = capturedLang === "ja";
    dispatch({ type: A.SEND_CHAT_START, payload: { sessionId, text: userMsg } });
    try {
      await sleep(450 + Math.random() * 300);
      const brain = kokoronBrainLogic(userMsg, capturedContext, capturedLang, cur.posts.items);
      if (brain.mode === "reply") {
        dispatch({ type: A.SEND_CHAT_SUCCESS, payload: { sessionId, text: brain.text, expression: brain.expression, context: brain.context } });
        return;
      }
      dispatch({ type: A.SET_WEB_SEARCHING });
      let web = null;
      try { web = await searchWikipedia(brain.topic, capturedLang); } catch (_) { web = null; }
      if (web) {
        const dbNote = brain.itemHit ? (ja ? "\n\n🎁 ちなみに商品としての基本情報はこれだけ分かる：" + describeItem(brain.itemHit, "ja").split("\n")[1] : "\n\n🎁 As a product, here's what I know: " + describeItem(brain.itemHit, "en").split("\n")[1]) : "";
        const text = ja
          ? "🌐 「" + brain.topic + "」について調べてきた！\n\n📖 " + web.title + "\n" + web.extract + "…\n\n[Wikipediaで続きを読む](" + web.url + ")" + dbNote
          : "🌐 I looked up \"" + brain.topic + "\"!\n\n📖 " + web.title + "\n" + web.extract + "…\n\n[Read more on Wikipedia](" + web.url + ")";
        dispatch({ type: A.SEND_CHAT_SUCCESS, payload: { sessionId, text, expression: "surprised", context: brain.context } });
      } else {
        let text = ja
          ? "「" + brain.topic + "」について、ネットでうまく調べきれなかった…正直に言うね🙏"
          : "I couldn't find reliable info on \"" + brain.topic + "\" online right now… being honest here🙏";
        if (brain.itemHit) {
          text += ja
            ? "\n\nただ、商品としての基本情報ならDBにある：" + describeItem(brain.itemHit, "ja").split("\n")[1] + "\n（これは商品情報で、調べてほしかった内容そのものじゃないかもしれない）"
            : "\n\nThough as a product, I do know this: " + describeItem(brain.itemHit, "en").split("\n")[1] + "\n(This is product info, not necessarily what you asked about.)";
        } else {
          text += ja
            ? "\n地域名（旭川・札幌・釧路など）のおすすめや、「蔵生って何？」みたいな質問なら得意！"
            : "\nTry region picks or questions like \"what is Kuranama?\"!";
        }
        dispatch({ type: A.SEND_CHAT_SUCCESS, payload: { sessionId, text, expression: "sad", context: brain.context } });
      }
    } catch {
      dispatch({ type: A.SEND_CHAT_ERROR, payload: { sessionId, text: ja ? "あれ、うまく答えられなかった…もう一度聞いてみてほしい🙏" : "Oops, something went wrong… please try again🙏" } });
    }
  }, []);

  const handleChatKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleSendChat();
    }
  }, [handleSendChat]);

  // ── 写真（実ファイル読み込み＋サンプル） ──
  const handlePickPhotoFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => dispatch({ type: A.SELECT_PHOTO, payload: reader.result });
    reader.readAsDataURL(file);
  };
  const handleSamplePhoto = () => {
    const [emoji, c1, c2] = PHOTO_PRESETS[Math.floor(Math.random() * PHOTO_PRESETS.length)];
    dispatch({ type: A.SELECT_PHOTO, payload: makePhoto(emoji, c1, c2) });
  };

  // ── 引用／もらった感想モーダルを開く ──
  const handleOpenQuote = useCallback((post, kind) => {
    const p = post.parts || {};
    dispatch({ type: A.OPEN_QUOTE_MODAL, payload: { kind, quoted: { userName: post.userName, giftEmoji: post.giftEmoji, giftName: post.giftName, snippet: (p.reason || p.note || post.review || "").slice(0, 50) } } });
  }, []);

  // ── 通知パネル：開くタイミングで未読をまとめて既読化する ──
  const handleToggleNotifPanel = useCallback(() => {
    dispatch({ type: A.TOGGLE_NOTIFICATIONS_PANEL });
    if (!stateRef.current.notifications.panelOpen) notificationService.markAllRead(stateRef.current.notifications.items);
  }, []);

  // ── 投稿 ──
  const combinedReview = [reviewReason, reviewReaction, reviewNote].map(s => (s || "").trim()).filter(Boolean).join("\n");
  const canSubmit = !!newGiftName && !!combinedReview && checkResult.status === "ok"
    && combinedReview.length <= MAX_REVIEW_LENGTH;

  const handlePostSubmit = async () => {
    if (!canSubmit) return;
    const s = stateRef.current;
    const uid = s.auth.currentUser?.uid || "anon";
    const newPostData = {
      uid,
      userName: s.auth.currentUser?.displayName || (t.myName + "_" + uid.slice(0, 6)),
      userAvatarUrl: s.auth.currentUser?.avatarUrl || null,
      userAvatar: t.myAvatar, avatarColor: "#C08A3E",
      giftEmoji: formMode === "thanks" ? "💝" : "🎁",
      giftBg: "linear-gradient(135deg,#eef2f5,#dbe4ec)",
      giftName: newGiftName,
      recipient: selectedRecipient || t.recipients[0],
      recipientName: recipientName?.trim() || "",
      moodTags: moodTags || [],
      scene: selectedScene || t.scenes[0],
      category: newPostCategory,
      rating: 5, price: selectedPrice || t.prices[0],
      review: combinedReview,
      parts: {
        reason: reviewReason?.trim() || "",
        reaction: reviewReaction?.trim() || "",
        note: reviewNote?.trim() || "",
        heart: reviewHeart?.trim() || "",
      },
      photoUrl: newPhotoUrl || null,
      postKind: formMode, quoted: quoteTarget, commentList: [],
      lat: 43.7628, lng: 142.3584, locationName: "北海道",
    };
    // 楽観的UI更新（Firestoreの応答を待たずに即表示）
    const optimisticId = "optimistic_" + Date.now();
    dispatch({ type: A.SUBMIT_POST_SUCCESS, payload: { ...newPostData, id: optimisticId, likes: 0, liked: false, comments: 0, createdAt: t.justNow } });
    // 投稿直後：人間の反応を待たせず、こころんが必ず受け止める
    setPostToast(true);
    setTimeout(() => setPostToast(false), 3000);
    // しばらく反応がない場合だけ、そっと「見てみる？」と贈る側へ誘導する（通知としては保存しない）
    setTimeout(() => {
      const mine = stateRef.current.posts.items.find(p => p.uid === uid);
      const engagement = mine ? (mine.likes || 0) + countComments(mine.commentList) : 0;
      if (engagement === 0) setNudgeVisible(true);
    }, 45000);
    // Firestoreに保存（onSnapshotが成功後に本物データで上書き）
    await postService.addPost(newPostData);
  };

  const postFormCoreProps = {
    t, mode: formMode, quoteTarget,
    giftName: newGiftName, onChangeGiftName: v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "giftName", value: v } }),
    category: newPostCategory, categories: t.categories.slice(1),
    onChangeCategory: v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "category", value: v } }),
    recipientName, onChangeRecipientName: v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "recipientName", value: v } }),
    moodTags, onToggleMoodTag: v => dispatch({ type: A.TOGGLE_MOOD_TAG, payload: v }),
    reviewReason, reviewReaction, reviewNote, reviewHeart,
    onChangeReviewPart: (field, value) => dispatch({ type: A.SET_REVIEW_PART, payload: { field, value } }),
    combinedReview, photoUrl: newPhotoUrl,
    onPickPhotoFile: handlePickPhotoFile, onSamplePhoto: handleSamplePhoto,
    checkResult, hatomono, onSubmit: handlePostSubmit, canSubmit,
  };

  const panels = {
    home: <HomePanel t={t} isDesktop={isDesktop} posts={posts} feedMode={feedMode} following={following} selectedCategory={selectedCategory} postSearchQuery={postSearchQuery} userLocation={userLocation} isLocating={isLocating} locationNote={locationNote} demoOrigin={demoOrigin} calcDist={calcDist} dispatch={dispatch} A={A} onOpenQuote={handleOpenQuote} myUid={myUid} myDisplayName={displayName} />,
    search: <SearchPanel t={t} isDesktop={isDesktop} hatomono={hatomono} isHatoTalking={isHatoTalking} chatLog={chatLog} chatInput={chatInput} isSending={isSending} isWebSearching={isWebSearching} sessions={chatSessions} activeId={chatActiveId} showHistory={chatShowHistory} dbSearchQuery={dbSearchQuery} onSendChat={handleSendChat} onChatKeyDown={handleChatKeyDown} dispatch={dispatch} A={A} />,
    gift: <GiftPanel t={t} isDesktop={isDesktop} dbSearchQuery={dbSearchQuery} dispatch={dispatch} A={A} />,
    post: (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
        <div style={{ background: "#FBF8F2", borderRadius: "16px", padding: "20px", border: "1px solid #D9D2C2" }}>
          <PostForm {...postFormCoreProps}
            scene={selectedScene} scenes={t.scenes} onChangeScene={v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "scene", value: v } })}
            recipient={selectedRecipient} recipients={t.recipients} onChangeRecipient={v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "recipient", value: v } })}
            price={selectedPrice} prices={t.prices} onChangePrice={v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "price", value: v } })} />
        </div>
      </div>
    ),
    me: <MePanel t={t} loginId={loginId} displayName={displayName} avatarUrl={avatarUrl} followingCount={following.length} onLogout={handleLogout} onSaveDisplayName={handleSaveDisplayName} onSaveAvatar={handleSaveAvatar} />,
  };

  if (isCheckingSession) {
    return (
      <div style={{ fontFamily: t.font, background: THEME.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <Kokoron size={90} expression="thinking" isTalking />
        <p style={{ fontSize: "13px", color: "#6B6F64" }}>{t.chatThinking}</p>
        <style>{"@keyframes sw{0%,100%{height:4px;}50%{height:14px;}}@keyframes hatoBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-3px);}}"}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.font, background: THEME.bg, minHeight: "100vh", color: "#2F3B2E" }}>
      <Header t={t} onToggleLang={() => dispatch({ type: A.SET_LANG, payload: lang === "ja" ? "en" : lang === "en" ? "ko" : "ja" })} isLoggedIn={isLoggedIn} notifications={notifications} onToggleNotifPanel={handleToggleNotifPanel} />

      {postToast && (
        <div style={{ position: "fixed", top: "70px", right: "20px", background: THEME.moss, color: THEME.cardBg, padding: "10px 20px", borderRadius: "10px", boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 100, display: "flex", alignItems: "center", gap: "10px", animation: "fadeInUp 0.35s ease" }}>
          <Kokoron size={34} expression="celebrate" /> <b>{t.postToastText}</b>
        </div>
      )}

      {nudgeVisible && isLoggedIn && (
        <button onClick={() => { setNudgeVisible(false); dispatch({ type: A.SET_NAV, payload: "home" }); }}
          style={{ position: "fixed", bottom: "84px", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px", background: THEME.cardBg, border: "1px solid " + THEME.line, borderRadius: "999px", padding: "8px 18px 8px 8px", boxShadow: "0 4px 14px rgba(0,0,0,0.14)", zIndex: 100, cursor: "pointer", animation: "fadeInUp 0.35s ease" }}>
          <Kokoron size={30} expression="wink" /> <span style={{ fontSize: "12.5px", color: THEME.ink, fontWeight: "bold" }}>{t.nudgeText}</span>
        </button>
      )}

      {!isLoggedIn ? (
        <AuthGate t={t} lang={lang} hatomono={hatomono} authStep={authStep} loginId={loginId} password={password}
          recoveryQ={recoveryQ} recoveryA={recoveryA} authError={authError} isSubmitting={isSubmitting} lastAction={lastAction}
          onChangeLoginId={v => dispatch({ type: A.AUTH_SET_LOGIN_ID, payload: v })}
          onChangePassword={v => dispatch({ type: A.AUTH_SET_PASSWORD, payload: v })}
          onChangeRecoveryQ={v => dispatch({ type: A.AUTH_SET_RECOVERY_Q, payload: v })}
          onChangeRecoveryA={v => dispatch({ type: A.AUTH_SET_RECOVERY_A, payload: v })}
          onLineLogin={handleLineLogin}
          onGotoSignup={() => dispatch({ type: A.AUTH_GOTO_STEP, payload: "signup_id" })}
          onGotoLogin={() => dispatch({ type: A.AUTH_GOTO_STEP, payload: "login_id" })}
          onAnonStart={handleAnonStart}
          onSubmit={handleAuthSubmit} onFinalizeLogin={handleFinalizeLogin} />
      ) : isDesktop ? (
        <div style={{ display: "flex", maxWidth: "1240px", margin: "0 auto" }}>
          <nav style={{ width: "200px", flexShrink: 0, padding: "20px 12px", position: "sticky", top: "61px", height: "calc(100vh - 61px)", boxSizing: "border-box" }}>
            {NAV_META.map(({ nav, emoji }) => (
              <button key={nav} onClick={() => dispatch({ type: A.SET_NAV, payload: nav })}
                style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 16px", marginBottom: "4px", background: currentNav === nav ? "#E3EEF9" : "none", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "bold", color: currentNav === nav ? "#C08A3E" : "#6B6F64", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}>
                <span style={{ fontSize: "20px" }}>{emoji}</span>{t["nav" + nav.charAt(0).toUpperCase() + nav.slice(1)]}
              </button>
            ))}
          </nav>
          <main style={{ flex: 1, minWidth: 0, paddingBottom: "40px" }}>{panels[currentNav]}</main>
        </div>
      ) : (
        <div style={{ paddingBottom: "64px" }}>
          <p style={{ fontSize: "10px", color: "#93958A", textAlign: "center", margin: "8px 0 0 0" }}>{t.swipeHint}</p>
          <div ref={tabScrollRef} onScroll={handleTabScroll} className="agete-snap"
            style={{ display: "flex", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {NAV_ORDER.map(nav => (
              <div key={nav} style={{ flex: "0 0 100%", minWidth: 0, scrollSnapAlign: "start", scrollSnapStop: "always", overflowY: "auto", height: "calc(100vh - 148px)", boxSizing: "border-box" }}>
                {panels[nav]}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoggedIn && !isDesktop && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderTop: "1px solid #D9D2C2", display: "flex", justifyContent: "space-around", padding: "6px 0 10px 0", zIndex: 30 }}>
          {NAV_META.map(({ nav, emoji }) => (
            <button key={nav} onClick={() => dispatch({ type: A.SET_NAV, payload: nav })}
              style={{ background: "none", border: "none", flexDirection: "column", alignItems: "center", display: "flex", fontSize: "10px", color: currentNav === nav ? "#C08A3E" : "#93958A", cursor: "pointer", fontWeight: "bold", padding: "4px 14px", borderTop: currentNav === nav ? "2.5px solid #C08A3E" : "2.5px solid transparent", transition: "color 0.2s, border 0.2s" }}>
              <span style={{ fontSize: "19px" }}>{emoji}</span>{t["nav" + nav.charAt(0).toUpperCase() + nav.slice(1)]}
            </button>
          ))}
        </nav>
      )}

      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }} onClick={e => { if (e.target === e.currentTarget) dispatch({ type: A.CLOSE_POST_MODAL }); }}>
          <div style={{ background: "#FBF8F2", borderRadius: "16px", padding: "20px", maxWidth: "500px", width: "100%", maxHeight: "88vh", overflowY: "auto", position: "relative", animation: "fadeInUp 0.3s ease" }}>
            <button onClick={() => dispatch({ type: A.CLOSE_POST_MODAL })} style={{ position: "absolute", top: "12px", right: "16px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#93958A", lineHeight: 1 }}>✕</button>
            <PostForm {...postFormCoreProps} />
          </div>
        </div>
      )}

      <style>{`
        .agete-snap::-webkit-scrollbar { display: none; }
        .magokoro-tag { position: relative; }
        .magokoro-tag::before {
          content: ""; position: absolute; top: 10px; left: 14px;
          width: 9px; height: 9px; border-radius: 50%;
          background: ${THEME.bg}; border: 1.4px solid ${THEME.line}; z-index: 2;
        }
        .magokoro-tag::after {
          content: ""; position: absolute; top: 14px; left: 18px;
          width: 22px; height: 14px;
          border-left: 1.4px solid ${THEME.line}; border-bottom: 1.4px solid ${THEME.line};
          border-radius: 0 0 0 10px; z-index: 2;
        }
        @keyframes sw { 0%,100% { height: 4px; } 50% { height: 14px; } }
        @keyframes floatHeart { 0%,100% { transform: translateY(0) scale(1); opacity: 1; } 50% { transform: translateY(-6px) scale(1.15); opacity: 0.85; } }
        @keyframes hatoBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
        @keyframes tearDrop { 0% { transform: translateY(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(10px); opacity: 0; } }
        @keyframes zzzFloat { 0%,100% { transform: translateY(0); opacity: 0.9; } 50% { transform: translateY(-5px); opacity: 0.5; } }
        * { -webkit-tap-highlight-color: transparent; }
        input, textarea, select, button { font-family: inherit; }
      `}</style>
    </div>
  );
}
