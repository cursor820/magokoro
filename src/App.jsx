import { useReducer, useEffect, useRef, useState, useCallback } from "react";

// ── Firebase SDK（環境変数で設定・GitHubには鍵を残さない） ──────────────
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, increment, serverTimestamp, query, orderBy, limit } from "firebase/firestore";

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
// 🐦 ここりす（表情10種）
// ══════════════════════════════════════════════════
// ══════════════════════════════════════════════════
// 🐿️ ここりす（まごころのマスコット・表情11種）
// お餅みたいな丸ボディ／ふわふわしっぽ／両手にまごころの種（ハートのどんぐり）
// まごころが高まる（happy/celebrate/tokimeki）と、種がポッと発光する
// ══════════════════════════════════════════════════
const Cocorisu = ({ size = 90, expression = "idle", isTalking = false, showAngerMark = false }) => {
  const isAngry = expression === "angry" || showAngerMark;
  const isDere = expression === "tokimeki";
  const glow = expression === "happy" || expression === "celebrate" || isDere;
  const acorn = glow ? "#FF9E5A" : "#E8875A";
  const cheekOp = isDere ? 0.95 : glow ? 0.85 : 0.6;
  const eyes = (() => {
    if (glow) return (<g><path d="M41 47 Q45 42.5 49 47" stroke="#2D2926" strokeWidth="2.6" fill="none" strokeLinecap="round"/><path d="M61 47 Q65 42.5 69 47" stroke="#2D2926" strokeWidth="2.6" fill="none" strokeLinecap="round"/></g>);
    if (expression === "wink") return (<g><circle cx="45" cy="46" r="4" fill="#2D2926"/><circle cx="46.4" cy="44.6" r="1.3" fill="#fff"/><path d="M61 46.5 Q65 44 69 46.5" stroke="#2D2926" strokeWidth="2.6" fill="none" strokeLinecap="round"/></g>);
    if (expression === "surprised") return (<g><circle cx="45" cy="46" r="5.2" fill="#2D2926"/><circle cx="65" cy="46" r="5.2" fill="#2D2926"/><circle cx="46.8" cy="44.2" r="1.7" fill="#fff"/><circle cx="66.8" cy="44.2" r="1.7" fill="#fff"/></g>);
    if (expression === "sleepy") return (<g><path d="M41 47 L49 47" stroke="#2D2926" strokeWidth="2.6" strokeLinecap="round"/><path d="M61 47 L69 47" stroke="#2D2926" strokeWidth="2.6" strokeLinecap="round"/></g>);
    if (expression === "sad" || expression === "concerned") return (<g><circle cx="45" cy="47.5" r="3.6" fill="#2D2926"/><circle cx="65" cy="47.5" r="3.6" fill="#2D2926"/><circle cx="46.2" cy="46.3" r="1.2" fill="#fff"/><circle cx="66.2" cy="46.3" r="1.2" fill="#fff"/></g>);
    if (isAngry) return (<g><path d="M40 40.5 L50 43.5" stroke="#2D2926" strokeWidth="2.4" strokeLinecap="round"/><path d="M70 40.5 L60 43.5" stroke="#2D2926" strokeWidth="2.4" strokeLinecap="round"/><circle cx="45" cy="47" r="3.8" fill="#2D2926"/><circle cx="65" cy="47" r="3.8" fill="#2D2926"/></g>);
    return (<g><circle cx="45" cy="46" r="4" fill="#2D2926"/><circle cx="65" cy="46" r="4" fill="#2D2926"/><circle cx="46.4" cy="44.6" r="1.4" fill="#fff"/><circle cx="66.4" cy="44.6" r="1.4" fill="#fff"/></g>);
  })();
  const mouth = glow
    ? <path d="M50 58 Q55 62.5 60 58" stroke="#C87850" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    : expression === "sad" || expression === "concerned"
      ? <path d="M50 61 Q55 57.5 60 61" stroke="#C87850" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      : expression === "surprised"
        ? <circle cx="55" cy="59.5" r="2.6" fill="#C87850"/>
        : <path d="M55 56 Q53 59 50 58 M55 56 Q57 59 60 58" stroke="#C87850" strokeWidth="1.5" fill="none" strokeLinecap="round"/>;
  return (
    <div style={{ position: "relative", width: size, height: size * 1.1, flexShrink: 0, animation: "hatoBob 3.2s ease-in-out infinite" }}>
      <svg width={size} height={size * 1.1} viewBox="0 0 120 130" style={{ display: "block" }}>
        <path d="M76 96 C101 92 108 60 93 38 C87 30 76 29 72 36 C81 42 85 53 83 65 C81 78 77 87 74 94 Z" fill="#D9935E"/>
        <path d="M79 88 C93 81 97 60 89 46" stroke="#E8A87C" strokeWidth="5" fill="none" strokeLinecap="round"/>
        {glow && <circle cx="56.5" cy="77" r="15" fill="#FFE8A0" opacity="0.55"><animate attributeName="opacity" values="0.25;0.7;0.25" dur="1.6s" repeatCount="indefinite"/></circle>}
        <ellipse cx="55" cy="88" rx="34" ry="30" fill="#F5D5B0"/>
        <ellipse cx="55" cy="95" rx="22" ry="19" fill="#FCF0E0"/>
        <circle cx="55" cy="48" r="28" fill="#F5D5B0"/>
        <ellipse cx="36" cy="26" rx="9" ry="12" fill="#F5D5B0" transform="rotate(-15 36 26)"/>
        <ellipse cx="74" cy="26" rx="9" ry="12" fill="#F5D5B0" transform="rotate(15 74 26)"/>
        <ellipse cx="37" cy="28" rx="4.5" ry="6.5" fill="#E8A87C" transform="rotate(-15 37 28)"/>
        <ellipse cx="73" cy="28" rx="4.5" ry="6.5" fill="#E8A87C" transform="rotate(15 73 28)"/>
        {eyes}
        <ellipse cx="38" cy="55" rx="5.5" ry="3.5" fill={isDere ? "#F26B9E" : "#F5A0A0"} opacity={cheekOp}/>
        <ellipse cx="72" cy="55" rx="5.5" ry="3.5" fill={isDere ? "#F26B9E" : "#F5A0A0"} opacity={cheekOp}/>
        <ellipse cx="55" cy="53.5" rx="2.5" ry="1.8" fill="#C87850"/>
        {mouth}
        <ellipse cx="43" cy="80" rx="7" ry="6" fill="#F5D5B0"/>
        <ellipse cx="67" cy="80" rx="7" ry="6" fill="#F5D5B0"/>
        <path d="M63 74 C62 71 58 71 56.5 74 C55 71 51 71 50 74 C48.5 78 55 83 56.5 83 C58 83 64.5 78 63 74 Z" fill={acorn}/>
        <path d="M56.5 71 L56.5 68.5" stroke="#8B6844" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      {isDere && <div style={{ position: "absolute", top: "-10px", right: "-4px", fontSize: size * .2, animation: "floatHeart 1.2s ease-in-out infinite" }}>🩷</div>}
      {expression === "surprised" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", fontSize: size * .18, animation: "popIn 0.3s ease-out" }}>💡</div>}
      {expression === "sad" && <div style={{ position: "absolute", top: "42%", left: "18%", fontSize: size * .13, animation: "tearDrop 1.6s ease-in infinite" }}>💧</div>}
      {expression === "sleepy" && <div style={{ position: "absolute", top: "-12px", right: "-8px", fontSize: size * .17, animation: "zzzFloat 2s ease-in-out infinite" }}>💤</div>}
      {expression === "celebrate" && <div style={{ position: "absolute", top: "-12px", left: "-6px", fontSize: size * .16, animation: "floatHeart 1s ease-in-out infinite" }}>✨</div>}
      {expression === "wink" && <div style={{ position: "absolute", top: "-10px", right: "-6px", fontSize: size * .16, animation: "popIn 0.3s ease-out" }}>⭐</div>}
      {isAngry && <div style={{ position: "absolute", top: "-12px", right: "-6px", fontSize: size * .18, animation: "popIn 0.3s ease-out" }}>💢</div>}
      {isTalking && <div style={{ position: "absolute", bottom: "-14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "3px", alignItems: "flex-end" }}>{[0, 1, 2, 3, 4].map(i => <div key={i} style={{ width: "3px", background: "#E8875A", borderRadius: "2px", animation: "sw 0.5s ease-in-out infinite", animationDelay: `${i * .1}s` }} />)}</div>}
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
    font: "'Noto Sans JP', sans-serif",
    navHome: "ホーム", navSearch: "さがす", navPost: "投稿", navMe: "マイページ",
    chatTitle: "ここりすAIチャット", chatSub: "文脈を覚えて、わからないことはネットで調べるりす🌐",
    chatPlaceholder: "ここりすに聞いてみる...",
    chatWelcome: "こんにちは！ぼく、ここりすだよ🐿️\nお土産・ギフトのおすすめはもちろん、「〇〇の歴史を調べて」みたいな質問なら、ネットで調べて答えるりす🌐",
    quickExamples: ["旭川のおすすめお土産は？", "六花亭のおすすめ商品は？", "生チョコ使った旭川のクッキーって何だっけ？", "新千歳空港のお土産は？", "函館でダイエット中なんだけど…"],
    chatNewBtn: "＋ 新しいチャット", chatHistoryBtn: "🕘 履歴", chatDefaultTitle: "新しいチャット",
    chatThinking: "考え中りす…", chatSearchingWeb: "🌐 ネットで調べてるりす…",
    swipeHint: "← 左右スワイプでタブ移動できるりす →",
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
    previewTitle: "🎁 ここりすチェック＆投稿プレビュー",
    previewEmpty: "上の欄に入力すると、ここにプレビューが表示されて、ここりすがリアルタイムでチェックするりす！",
    photoBtn: "📸 写真を撮る・選ぶ", photoSelected: "📸 写真をセットしたりす！（タップで変更）", samplePhotoBtn: "🎲 サンプル写真",
    checkPending: "レビューを書いたら、ここりすが自動でチェックするりす！",
    checkGateNote: "⚠️ ここりすのチェックを通過すると投稿できるりす",
    submitBtn: "投稿する 🎁",
    postSearchPlaceholder: "投稿を検索（贈り物名・レビュー内容）",
    noMatchTitle: "一致する投稿が見つかりませんでした。", noMatchDesc: "キーワードやカテゴリを変えてみてください。",
    dbTitle: "📦 お土産データベース", dbSearchPlaceholder: "お土産名・地域・タグで検索",
    dbSearchNoMatch: "一致するお土産が見つからなかったりす…",
    otoriyoseNote: "現地に行けないときでも、大切な人にすぐ届けられる優しさを。ここりすがお取り寄せをお手伝いするりす🎁",
    otoriyoseAd: "※価格・内容量は目安／リンクは広告（アフィリエイト）を含む場合があります",
    otoriyoseAmazon: "📦 お取り寄せでまごころを贈る（Amazon）",
    otoriyoseRakuten: "🚪 遠くからでも届ける（楽天）",
    otoriyosePostPrefix: "📦 「", otoriyosePostSuffix: "」— 現地に行けなくても、これを贈れるりす",
    categories: ["すべて", "グルメ", "インテリア", "体験・チケット", "フラワー", "ファッション・アクセサリー", "美容", "雑貨・伝統工芸", "言葉・きもち", "行動・お手伝い"],
    scenes: ["誕生日", "引越し祝い", "結婚記念日", "退職祝い", "出産祝い", "バレンタイン", "ホワイトデー", "母の日", "父の日", "日頃の感謝", "その他"],
    recipients: ["母", "父", "友人（女性）", "友人（男性）", "恋人", "配偶者", "兄弟・姉妹", "上司", "同僚", "祖父母", "両親", "子ども", "自分", "その他"],
    prices: ["プライスレス", "〜¥1,000", "¥1,000〜3,000", "¥3,000〜5,000", "¥5,000〜10,000", "¥10,000〜"],
    nearbyBtn: "📍 近くのお土産から探す", distanceUnit: "m先",
    nearbyFallbackNote: "現在地を取得できなかったので、旭川駅の周辺で表示してるりす！",
    locateBtn: "📍 現在地を使う", locating: "取得中…", locationSetNote: "現在地を設定したりす！",
    nearHere: "現在地付近",
    feedAll: "すべて", feedFollowing: "フォロー中",
    followBtn: "＋ フォロー", followingBtn: "✓ フォロー中",
    feedFollowingEmpty: "まだ誰もフォローしていないりす。気になる人の「＋ フォロー」を押してみてりす！",
    commentsTitle: "コメント", commentPh: "コメントを書く…", commentSend: "送信",
    replyBtn: "返信", replyPh: "返信を書く…", noComments: "まだコメントがないりす。最初のコメントを書いてみてりす！",
    quoteBtn: "🔁 引用して投稿", thanksBtn: "💝 もらった感想",
    quotedLabel: "🔁 引用元の投稿", thanksLabel: "💝 このギフトを受け取りました",
    quoteModeTitle: "🔁 引用して投稿する", thanksModeTitle: "💝 もらった感想を投稿する",
    thanksReasonLabel: "💝 もらったときの状況", thanksReasonPh: "例：誕生日に娘からもらいました",
    thanksReactionLabel: "🥰 もらった気持ち", thanksReactionPh: "例：驚きと嬉しさで、思わず笑顔になりました",
    authTagline: "だれかを想うスイッチ、ON。", authSubtitle: "お土産・ギフトのレビューをシェアしよう",
    authCocorisuWelcomeBack: "おかえりなさいりす！",
    authLineBtn: "LINEで3秒登録・ログイン",
    authIdpassBtn: "個人情報の入力なしで始める",
    authSwitchToLogin: "すでにアカウントをお持ちの方は", authSwitchToSignup: "はじめての方は",
    authLoginLink: "ログイン", authSignupLink: "新規登録",
    authPassword: "パスワード", authLoginId: "ログインID", authLoginIdHint: "半角英数字3〜20文字",
    authSubmitSignupId: "この内容で始める", authSubmitLoginId: "ログインする",
    authRecoveryTitle: "パスワードを忘れたときのための質問",
    authRecoveryHint: "メールアドレスを登録しない代わりに、本人確認用の質問を設定します",
    authRecoverySelectPh: "質問を選ぶ", authRecoveryAnswer: "答え",
    authErrRequired: "入力してください", authErrLoginIdShort: "ログインIDは3文字以上で入力してください",
    authErrPasswordShort: "パスワードは6文字以上で入力してください",
    authErrInvalidCredentials: "ログインIDまたはパスワードが正しくないりす…",
    authErrDuplicateId: "そのログインIDはすでに使われているりす…別のIDを試してほしいりす",
    authErrNetwork: "サーバーに接続できなかったりす…時間をおいてもう一度試してほしいりす",
    authSubmitting: "送信中…",
    authWelcomeBackBody: "続きから、お土産の物語を集めていこう。",
    authSuccessTitle: "ようこそ、まごころへ！",
    authSuccessBody: "Lv.1からスタートだりす！さっそくお土産の物語を集めにいこう。",
    authSuccessCta: "はじめる", authLogout: "ログアウト",
    recoveryPresets: ["最初に飼ったペットの名前は？", "生まれた町の名前は？", "好きな映画のタイトルは？", "子供の頃のあだ名は？", "一番好きだった先生の名前は？"],
    levelLabel: "Lv.", xpLabel: "XP", xpGained: "+20 XP 獲得したりす！",
    rankLabel: "現在のランク:", rankName: "お土産マイスター", nextLevelBefore: "次のレベルまであと", memberIdLabel: "まごころ 会員 ID:",
    followingCountLabel: "フォロー中",
    modalTitle: "🎁 贈り物レビューを投稿",
    giftNameLabel: "贈り物の名前", giftNamePh: "例：肩もみ券30分／北海道スイーツセット",
    categoryLabel: "カテゴリ", sceneLabel: "シーン", recipientLabel: "贈り先", priceLabel: "価格帯",
  },
  en: {
    appSub: "Gift Review Community", postBtn: "+ Post Review", switchLabel: "日本語",
    heroTitle: '"That gift was perfect."', heroSub: " Share your gifting story.",
    heroDesc: "Things, experiences, even words. Share what you gave — and how it felt to receive.",
    toLabel: "To: ", shareBtn: "↗ Share", justNow: "Just now", myName: "You", myAvatar: "Y",
    font: "'Inter','Helvetica Neue',sans-serif",
    navHome: "Home", navSearch: "Search", navPost: "Post", navMe: "Profile",
    chatTitle: "Cocorisu AI Chat", chatSub: "Remembers context & searches the web-risu 🌐",
    chatPlaceholder: "Ask Cocorisu anything...",
    chatWelcome: "Hey there! I'm Cocorisu-risu!\nAsk me for gift picks, or things like \"look up the history of ___\" and I'll search the web-risu 🌐",
    quickExamples: ["Asahikawa souvenir ideas?", "Any music boxes in Otaru?", "That chocolate cookie from Asahikawa?", "Souvenirs at New Chitose Airport?", "On a diet in Hakodate..."],
    chatNewBtn: "＋ New chat", chatHistoryBtn: "🕘 History", chatDefaultTitle: "New chat",
    chatThinking: "Thinking-risu…", chatSearchingWeb: "🌐 Searching the web-risu…",
    swipeHint: "← Swipe left/right to switch tabs-risu →",
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
    previewTitle: "🎁 Cocorisu Check & Post Preview",
    previewEmpty: "Fill in the fields above — your preview appears here and Cocorisu checks it in real time-risu!",
    photoBtn: "📸 Take / choose a photo", photoSelected: "📸 Photo set-risu! (tap to change)", samplePhotoBtn: "🎲 Sample photo",
    checkPending: "Write your review and Cocorisu will auto-check it-risu!",
    checkGateNote: "⚠️ Pass Cocorisu's check to unlock posting-risu",
    submitBtn: "Post Review 🎁",
    postSearchPlaceholder: "Search posts (gift name, review text)",
    noMatchTitle: "No matching posts found.", noMatchDesc: "Try a different keyword or category.",
    dbTitle: "📦 Souvenir Database", dbSearchPlaceholder: "Search by name, region, or tag",
    dbSearchNoMatch: "No matching souvenirs found-risu…",
    otoriyoseNote: "Too far to visit? You can still send your magokoro today — Cocorisu will help with the mail order-risu 🎁",
    otoriyoseAd: "* Prices are approximate / links may include affiliate ads",
    otoriyoseAmazon: "📦 Send magokoro by mail order (Amazon)",
    otoriyoseRakuten: "🚪 Deliver from afar (Rakuten)",
    otoriyosePostPrefix: "📦 「", otoriyosePostSuffix: "」— send this from afar-risu",
    categories: ["All", "Food & Drink", "Home & Decor", "Experiences", "Flowers", "Fashion & Accessories", "Beauty", "Crafts & Traditional Goods", "Words & Feelings", "Acts of Service"],
    scenes: ["Birthday", "Housewarming", "Anniversary", "Farewell", "Baby Gift", "Valentine's", "White Day", "Mother's Day", "Father's Day", "Everyday Thanks", "Other"],
    recipients: ["Mother", "Father", "Female Friend", "Male Friend", "Partner", "Spouse", "Sibling", "Boss", "Colleague", "Grandparents", "Parents", "Child", "Myself", "Other"],
    prices: ["Priceless", "Under ¥1,000", "¥1,000–3,000", "¥3,000–5,000", "¥5,000–10,000", "¥10,000+"],
    nearbyBtn: "📍 Find souvenirs near me", distanceUnit: "m away",
    nearbyFallbackNote: "Couldn't get your location, showing near Asahikawa Station instead-risu!",
    locateBtn: "📍 Use current location", locating: "Locating…", locationSetNote: "Location set-risu!",
    nearHere: "Near current location",
    feedAll: "All", feedFollowing: "Following",
    followBtn: "+ Follow", followingBtn: "✓ Following",
    feedFollowingEmpty: "You're not following anyone yet-risu. Tap \"+ Follow\" on posts you like-risu!",
    commentsTitle: "Comments", commentPh: "Write a comment…", commentSend: "Send",
    replyBtn: "Reply", replyPh: "Write a reply…", noComments: "No comments yet-risu. Be the first-risu!",
    quoteBtn: "🔁 Quote & post", thanksBtn: "💝 I received this",
    quotedLabel: "🔁 Quoted post", thanksLabel: "💝 Received this gift",
    quoteModeTitle: "🔁 Quote & Post", thanksModeTitle: "💝 Post as the Receiver",
    thanksReasonLabel: "💝 How you received it", thanksReasonPh: "e.g. My daughter gave it to me on my birthday",
    thanksReactionLabel: "🥰 How it felt", thanksReactionPh: "e.g. Surprised and so happy — I couldn't stop smiling",
    authTagline: "Switch on. Think of someone.", authSubtitle: "Share your gifting stories.",
    authCocorisuWelcomeBack: "Welcome back-risu!",
    authLineBtn: "Continue with LINE (3 sec)",
    authIdpassBtn: "Start without personal info",
    authSwitchToLogin: "Already have an account?", authSwitchToSignup: "New here?",
    authLoginLink: "Log in", authSignupLink: "Sign up",
    authPassword: "Password", authLoginId: "Login ID", authLoginIdHint: "3–20 letters/numbers",
    authSubmitSignupId: "Start with these details", authSubmitLoginId: "Log in",
    authRecoveryTitle: "A question for password recovery",
    authRecoveryHint: "Since there's no email on file, set a question to verify it's you",
    authRecoverySelectPh: "Choose a question", authRecoveryAnswer: "Answer",
    authErrRequired: "This field is required", authErrLoginIdShort: "Login ID must be at least 3 characters",
    authErrPasswordShort: "Password must be at least 6 characters",
    authErrInvalidCredentials: "Login ID or password is incorrect-risu…",
    authErrDuplicateId: "That login ID is already taken-risu…",
    authErrNetwork: "Couldn't connect to the server-risu…",
    authSubmitting: "Submitting…",
    authWelcomeBackBody: "Let's pick up where you left off.",
    authSuccessTitle: "Welcome to Magokoro!",
    authSuccessBody: "Starting at Lv.1 — let's find some souvenir stories.",
    authSuccessCta: "Get started", authLogout: "Log out",
    recoveryPresets: ["What was your first pet's name?", "What town were you born in?", "What's your favorite movie?", "What was your childhood nickname?", "Who was your favorite teacher?"],
    levelLabel: "Lv.", xpLabel: "XP", xpGained: "+20 XP earned-risu!",
    rankLabel: "Current rank:", rankName: "Souvenir Meister", nextLevelBefore: "Next level in", memberIdLabel: "Magokoro Member ID:",
    followingCountLabel: "Following",
    modalTitle: "🎁 Post a Gift Review",
    giftNameLabel: "Gift Name", giftNamePh: "e.g. 30-min shoulder massage coupon / Hokkaido Sweet Set",
    categoryLabel: "Category", sceneLabel: "Occasion", recipientLabel: "Recipient", priceLabel: "Price Range",
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
      { id: "c1", name: "kota.gifts", avatar: "K", color: "#4A7C6F", text: "地元の味って一番喜ばれますよね！参考になります🍜", time: "1日前", replies: [{ id: "r1", name: "Haruka_M", avatar: "H", color: "#C17B74", text: "ですよね！来年はスープカレーにしようか迷ってます笑", time: "1日前" }] },
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
    commentList: [{ id: "c1", name: "james.g", avatar: "J", color: "#4A7C6F", text: "Kyoto chocolatiers are so underrated!", time: "1 day ago", replies: [] }] },
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
const SOUVENIR_DB = [
  { id: "s1", region: "旭川", name: "六花亭 マルセイバターサンド", contents: "10個入り ¥1,350・20個入り ¥2,700", aliases: ["マルセイバターサンド", "バターサンド", "マルセイ", "六花亭"], category: "グルメ", tags: ["甘い物", "定番", "バター", "サンドクッキー", "レーズン"], emoji: "🍪", price: "¥1,000〜3,000", shop: "六花亭 旭川店", airports: ["新千歳空港", "旭川空港"],kcalNote: "1個 約168kcal（目安）", stations: ["旭川駅", "札幌駅"], lat: 43.7651, lng: 142.3551 },
  { id: "s2", region: "旭川", name: "ロバ菓子司 蔵生（くらなま）", contents: "6枚入り ¥730", aliases: ["蔵生", "くらなま", "kuranama"], category: "グルメ",
    tags: ["生チョコ", "クッキー", "生チョコクッキー", "サクサク", "しっとり", "旭川クッキー", "チョコレート", "焼き菓子", "保存料不使用", "北海道産小麦", "ビートグラニュー糖"],
    emoji: "🍪", price: "〜¥1,000", shop: "The Sun 蔵人 本店", airports: ["旭川空港"],stations: ["旭川駅"], lat: 43.7542, lng: 142.3812 },
  { id: "s3", region: "旭川", name: "あさひかわ牧場 特製プリン", aliases: ["特製プリン"], category: "グルメ", tags: ["とろける", "スイーツ", "プリン"], emoji: "🍮", price: "〜¥1,000", shop: "旭川駅お土産売店",stations: ["旭川駅"], lat: 43.7628, lng: 142.3584 },
  { id: "s4", region: "札幌", name: "石屋製菓 白い恋人", contents: "18枚入り ¥1,296・36枚入り ¥2,376", aliases: ["白い恋人", "しろいこいびと", "shiroi koibito"], category: "グルメ", tags: ["大定番", "サクサク", "ラングドシャ", "ホワイトチョコ"], emoji: "🟨", price: "¥1,000〜3,000", shop: "白い恋人パーク", airports: ["新千歳空港"],kcalNote: "1枚 約57kcal（目安）", stations: ["札幌駅"], lat: 43.0883, lng: 141.2711 },
  { id: "s4b", region: "札幌", name: "サッポロビール園限定 ジンギスカンだれ", aliases: ["ジンギスカン", "サッポロビール"], category: "グルメ", tags: ["名物", "調味料", "お土産定番"], emoji: "🐑", price: "〜¥1,000", shop: "サッポロビール園", lat: 43.0724, lng: 141.393 },
  { id: "s5", region: "函館", name: "スナッフルス チーズオムレット", contents: "6個入り ¥1,188", aliases: ["チーズオムレット", "スナッフルス"], category: "グルメ", tags: ["ふわふわ", "濃厚", "チーズ", "スフレ"], emoji: "🧀", price: "¥1,000〜3,000", shop: "函館駅前店", airports: ["函館空港", "新千歳空港"],stations: ["函館駅"], lat: 41.7731, lng: 140.7264 },
  { id: "s6", region: "釧路", name: "阿寒湖 まりも羊羹", aliases: ["まりも羊羹"], category: "グルメ", tags: ["定番", "阿寒湖", "和菓子", "羊羹"], emoji: "🍡", price: "〜¥1,000", shop: "阿寒湖温泉街 土産店", lat: 43.4306, lng: 144.0956 },
  { id: "s7", region: "釧路", name: "マリモガラスのペンダント", aliases: ["マリモペンダント"], category: "ファッション・アクセサリー", tags: ["ペンダント", "マリモ", "ガラス", "アクセサリー"], emoji: "📿", price: "¥1,000〜3,000", shop: "阿寒湖アイヌコタン", lat: 43.4322, lng: 144.0871 },
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
  { id: "s40", region: "中札内", name: "花畑牧場 生キャラメル", aliases: ["生キャラメル", "花畑牧場", "はなばたけぼくじょう"], category: "グルメ", tags: ["生キャラメル", "北海道牛乳", "濃厚", "話題", "要冷蔵"], emoji: "🍮", price: "¥1,000〜3,000", shop: "花畑牧場 直売店・新千歳空港", airports: ["新千歳空港"], lat: 42.7127, lng: 143.0939 },
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
// 🧠 ここりすの頭脳 v3
// ══════════════════════════════════════════════════
const CHAT_REGIONS = ["旭川", "札幌", "函館", "釧路", "北見", "小樽", "帯広", "富良野", "根室", "稚内", "網走", "苫小牧", "室蘭", "登別", "知床", "千歳", "洞爺湖", "砂川", "中札内", "十勝", "余市", "夕張", "白老", "アイヌ"];
const OTHER_KNOWN_PLACES = ["中標津", "名寄", "士別", "夕張", "岩見沢", "浦河", "積丹", "余市", "芦別", "深川", "留萌", "紋別", "遠軽", "厚岸", "標茶", "弟子屈", "白老", "伊達", "江別", "恵庭"];
const KURANAMA_LINK_JA = "https://www.google.com/search?q=%E8%94%B5%E7%94%9F+%E3%83%AD%E3%83%90%E8%8F%93%E5%AD%90%E5%8F%B8+%E5%85%AC%E5%BC%8F";
const KURANAMA_LINK_EN = "https://www.google.com/search?q=Kuranama+Roba+Kashi+Asahikawa+official";

const LOOKUP_RE = /歴史|由来|とは(?:何|なに)?[？?]?$|について(?:教えて|調べて|知りたい)?|調べて|検索して|意味|創業|いつ(?:でき|から)|誰が|どこの会社|発祥|history|origin|look ?up|search|tell me about|who made|founded|when was/i;
const RECOMMEND_RE = /おすすめ|オススメ|お勧め|ある[？?]?|ありますか|欲しい|ほしい|買いたい|何がいい|なにがいい|選んで|recommend|suggest|ideas|any (souvenir|gift)|what should i (buy|get)/i;

function cleanLookupTopic(msg) {
  let t = msg
    .replace(/(の歴史|の由来|の意味|について)(を?)(教えて|調べて|知りたい)?(ください)?(りす)?(は|わ|も|って)?[。！!？?]*$/g, "")
    .replace(/(を?)(調べて|教えて|検索して)(ください)?(りす)?(は|わ|も)?[。！!？?]*$/g, "")
    .replace(/(とは何|とはなに|とは|って何|ってなに)(は|わ|も)?[？?。]*$/g, "")
    .replace(/^(look up|search for|search|tell me about|what is|who is)\s+/i, "")
    .replace(/(the history of|history of|origin of)\s+/i, "")
    .trim();
  return t || msg.trim();
}

function cocorisuBrainLogic(userMsg, context, lang, communityPosts = []) {
  const msg = userMsg.trim();
  const keep = { ...context };
  const ja = lang === "ja";
  const wasDown = context.mood === "down";
  keep.mood = null;

  if (/(死にたい|消えたい|いなくなりたい|自殺|リスカ|want to die|kill myself|suicide)/i.test(msg)) {
    keep.mood = "down";
    return { mode: "reply", text: ja
      ? "話してくれてありがとうりす。それだけ苦しい気持ちを、ここまでひとりで抱えてきたんだりすね…。\n僕はアプリの中の小さなリスだから、そばで話を聞くことしかできないりす。だからこそ、信頼できる人や相談窓口（よりそいホットライン 0120-279-338／24時間・無料）にも、その気持ちを話してみてほしいりす。\nあなたがここにいてくれること、僕はうれしいりす。"
      : "Thank you for telling me-risu. Carrying that alone must have been so heavy…\nI'm just a small squirrel inside an app, so all I can do is listen — that's why I hope you'll also share this with someone you trust, or a professional helpline. I'm glad you're here-risu.",
      expression: "sad", context: keep };
  }

  if (/(疲れた|つかれた|つらい|辛い|しんどい|悲しい|かなしい|落ち込|凹ん|へこん|寂しい|さみしい|さびしい|不安|泣きそう|泣いた|失敗し|うまくいかな|眠れな|やる気が出な|もうだめ|もう無理|もうムリ|tired|so sad|lonely|depressed|anxious|failed|can't sleep)/i.test(msg)) {
    keep.mood = "down";
    return { mode: "reply", text: ja
      ? "そっか…それは、しんどかったりすね。\n無理に元気を出さなくて大丈夫りす。よかったら、何があったかゆっくり聞かせてほしいりす。僕はここにいるりす。"
      : "That sounds really hard-risu…\nYou don't have to force yourself to feel better. I'm here if you want to talk about it-risu.",
      expression: "concerned", context: keep };
  }

  if (/(使えない|役に立たない|ちゃんと答えて|ちゃんとして|違うよ|そうじゃない|わかってない|分かってない|話聞いてる|not helpful|you're wrong|that's not what)/i.test(msg)) {
    return { mode: "reply", text: ja
      ? "ごめんりす…うまく汲み取れてなかったりす。\nもう少しだけ詳しく教えてもらえたら、今度こそちゃんと答えたいりす。「地域名＋おすすめ」や「〇〇について調べて」の形が得意りす。"
      : "I'm sorry-risu… I didn't understand that well.\nCould you tell me a bit more? I'll do my best this time-risu.",
      expression: "sad", context: keep };
  }

  if (/(愛してる|あいしてる|大好き|だいすき|好きだよ|love you|luv you)/i.test(msg)) {
    return { mode: "reply", text: ja
      ? "え、えぇっ！？　ぼ、僕も…大好きだりす…！\nそんなこと言われたら、しっぽまで真っピンクになっちゃうりす🩷\nこれからも、あなたのギフト選びをぜんりょくで手伝わせてほしいりす。"
      : "W-what!? I… I love you too-risu…!\nYou're making my tail fluff up all pink-risu 🩷", expression: "tokimeki", context: keep };
  }
  if (/(ありがとう|ありがと|感謝|thank you|thanks|thx)/i.test(msg)) {
    return { mode: "reply", text: ja
      ? "どういたしましてだりす…！\nそんなふうに言ってもらえると、照れてしっぽがピンクになっちゃうりす🩷\nまたいつでも聞いてほしいりす。"
      : "You're welcome-risu…! That makes me blush all pink-risu 🩷", expression: "tokimeki", context: keep };
  }
  if (/(かわいい|可愛い|cute)/i.test(msg)) {
    return { mode: "reply", text: ja ? "か、かわいい…！？ぼ、僕のこと…？\nうう、照れるりす…🩷" : "C-cute…!? Me…? I'm blushing-risu…🩷", expression: "tokimeki", context: keep };
  }

  if (/(おはよう|こんにちは|こんばんは|やあ|ハロー|hello|^hi\b|hey there)/i.test(msg)) {
    if (wasDown) {
      keep.mood = "down";
      return { mode: "reply", text: ja
        ? "こんにちはりす。少しは気持ち、落ち着いたりす？\n今日は無理せずいこうりす。話したくなったら、いつでもここにいるりす。"
        : "Hello-risu. Feeling a little better?\nTake it easy today. I'm here whenever you want to talk-risu.",
        expression: "concerned", context: keep };
    }
    return { mode: "reply", text: ja
      ? "こんにちはりす！🐦 今日はどんなギフトの話をするりす？\n地域名で聞いてくれたらおすすめを、「〇〇を調べて」ならネットで調べてくるりす。"
      : "Hello-risu! 🐦 Ask me with a region for picks, or say \"look up ___\" and I'll search the web-risu.",
      expression: "happy", context: keep };
  }
  if (/(おやすみ|眠い|ねむい|寝る|good ?night|sleepy)/i.test(msg)) {
    return { mode: "reply", text: ja ? "ふぁ…おやすみなさいだりす…💤\nいい夢を見てほしいりす。また明日、ギフトの話しようりす。" : "Yaaawn… good night-risu…💤 Sweet dreams-risu.", expression: "sleepy", context: keep };
  }
  if (/(すごい|やばい|まじで|マジで|えっ|amazing|wow)/i.test(msg) && msg.length < 15) {
    return { mode: "reply", text: ja ? "びっくりさせたりす！？😳 ギフトの世界は奥が深いりすよ。" : "Surprised you-risu!? 😳 The gift world runs deep-risu.", expression: "surprised", context: keep };
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
            ? "了解りす！じゃあカロリーは気にせず、" + regionNow + "のおいしいもの全部から選ぶりす🔥\n\n" + formatItemsCompare(freePicks, ja) + kcalFooter(freePicks, ja) + "\n気になるのはあったりす？"
            : "Got it-risu! Full-flavor mode for " + regionNow + "🔥\n\n" + formatItemsCompare(freePicks, ja) + kcalFooter(freePicks, ja),
            expression: "happy", context: keep };
        }
      }
      return { mode: "reply", text: ja
        ? "了解りす！じゃあカロリーは気にせず、おいしさ全振りで探すりす🔥\nどの地域（または空港・駅）で探すりす？"
        : "Got it-risu! Full-flavor mode then🔥 Which area, airport, or station shall we search-risu?",
        expression: "happy", context: keep };
    }
    // 商品名や売り場の指定があるときは、条件を外したまま下の通常処理へ流す
  }

  const lastItem = context.lastItemId ? SOUVENIR_DB.find(s => s.id === context.lastItemId) : null;
  if (lastItem && msg.length < 30) {
    if (/どこ(で|に)?(買|売|手に入)|場所|お店|店/.test(msg)) {
      const spots = [...(lastItem.stations || []), ...(lastItem.airports || [])];
      const spotNote = spots.length > 0
        ? (ja ? "\nそれと、" + spots.join("・") + "でも買えるりす！" : "\nAlso available at " + spots.join(", ") + "-risu!")
        : "";
      return { mode: "reply", text: ja
        ? "「" + lastItem.name + "」は、" + lastItem.shop + "（" + lastItem.region + "）で買えるりす。" + shopMapLink(lastItem, true) + "\n🚪 現地に行けなくても、ここから贈れるりす → [Amazon](" + amazonSearchUrl(lastItem.name) + ")　[楽天](" + rakutenSearchUrl(lastItem.name) + ")" + spotNote
        : "You can get \"" + lastItem.name + "\" at " + lastItem.shop + " (" + lastItem.region + ")-risu." + shopMapLink(lastItem, false) + "\n🛒 [Find on Amazon-risu](" + amazonSearchUrl(lastItem.name) + ") [Rakuten](" + rakutenSearchUrl(lastItem.name) + ")" + spotNote,
        expression: "happy", context: keep };
    }
    if (/いくら|値段|価格|how much/i.test(msg)) {
      return { mode: "reply", text: ja
        ? "「" + lastItem.name + "」の価格帯は" + lastItem.price + "りす。"
        : "\"" + lastItem.name + "\" is in the " + lastItem.price + " range-risu.",
        expression: "happy", context: keep };
    }
    if (/カロリー|kcal|キロカロリー/i.test(msg)) {
      return { mode: "reply", text: ja
        ? (lastItem.kcalNote
          ? "「" + lastItem.name + "」は " + lastItem.kcalNote + " だりす。正確な数値は、商品パッケージの栄養成分表示も見てほしいりす。"
          : "ごめんりす、「" + lastItem.name + "」の正確なカロリーはまだ僕のデータに無いりす…🙏 パッケージの栄養成分表示を確認してほしいりす。")
        : (lastItem.kcalNote
          ? "\"" + lastItem.name + "\": " + lastItem.kcalNote + " — check the package for exact numbers-risu."
          : "Sorry-risu, no calorie data yet for \"" + lastItem.name + "\" — please check the package🙏"),
        expression: lastItem.kcalNote ? "happy" : "concerned", context: keep };
    }
    if (/^(他|ほか)(に|の)?(は|も)?/.test(msg) || /他に(おすすめ|ある)|ほかに(おすすめ|ある)|anything else|other options/i.test(msg)) {
      const dietNow = context.condition === "diet";
      const pool = SOUVENIR_DB.filter(s => s.region === lastItem.region && s.id !== lastItem.id && (!dietNow || (s.tags || []).some(tg => HEALTHY_TAG_RE.test(tg))));
      if (pool.length > 0) {
        keep.lastItemId = pool[0].id;
        return { mode: "reply", text: ja
          ? lastItem.region + "なら、他に「" + pool.slice(0, 2).map(o => o.name).join("」「") + "」もあるりす。気になるのはあったりす？"
          : "In " + lastItem.region + ", there's also " + pool.slice(0, 2).map(o => o.name).join(" and ") + "-risu.",
          expression: "wink", context: keep };
      }
      if (dietNow) {
        return { mode: "reply", text: ja
          ? lastItem.region + "のヘルシー系は、いま紹介したものでぜんぶりす…正直に言うね🙏\n他の地域なら、🍬北見ハッカ飴や🌿がごめ昆布スナック（函館）もヘルシー系の定番りす。"
          : "That's all the healthy picks I have for " + lastItem.region + "-risu… being honest🙏",
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
        ? (ja ? venueName + "でヘルシー寄りに選ぶなら、これが比べやすいりす💪" : "Healthy-ish picks at " + venueName + "-risu💪")
        : (ja ? venueName + "でよく買われる定番はこのあたりりす" + (isStation ? "🚉" : "✈️") : "Popular picks at " + venueName + "-risu" + (isStation ? "🚉" : "✈️"));
      const shownVenueItems = items.slice(0, 4);
      const footer = kcalFooter(shownVenueItems, ja);
      return { mode: "reply", text: head + "\n\n" + formatItemsCompare(shownVenueItems, ja) + footer + "\n🗺️ [" + venueName + "を地図で見るりす](" + mapLink + ")" + findCommunityNote(venueName, communityPosts, ja),
        expression: "happy", context: keep };
    }
    if (dietActive) {
      return { mode: "reply", text: ja
        ? "正直に言うりす…" + venueName + "の売店データの中に、ヘルシー系として登録できているものがまだ無いりす🙏\n🍬北見ハッカ飴・🌿がごめ昆布スナックあたりがヘルシー系の定番だから、見かけたらチェックしてほしいりす。"
        : "Being honest-risu… no healthy-tagged items in my " + venueName + " data yet🙏",
        expression: "concerned", context: keep };
    }
    return { mode: "reply", text: ja
      ? venueName + "の売店情報は、まだ僕のデータがそんなに多くないりす…正直に言うね🙏\n🗺️ [場所だけ地図で見るりす](" + mapLink + ")"
      : "I don't have much data on " + venueName + "'s shops yet-risu…🙏\n🗺️ [See it on Maps-risu](" + mapLink + ")",
      expression: "concerned", context: keep };
  }

  if (mentionedUnknownPlace && !isLookup) {
    return { mode: "reply", text: ja
      ? "正直に言うりす…「" + mentionedUnknownPlace + "」のお土産は、まだ僕のデータベースに入っていないりす🙏\n今得意なのは旭川・札幌・函館・釧路・北見・小樽・帯広・富良野・根室・稚内・網走・苫小牧・室蘭・登別・知床・千歳・洞爺湖だから、その中で聞いてもらえたら嬉しいりす！"
      : "Being honest-risu… I don't have data on \"" + mentionedUnknownPlace + "\" souvenirs yet🙏\nI cover the major Hokkaido areas — try asking about one of those-risu!",
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
        ? "蔵生は、素材にとことん真面目なお菓子りす。\n北海道産小麦粉と、てんさい由来のビートグラニュー糖を100%使用、保存料も不使用なんだりす✨ しっとりサクサクの生地に、とろける生チョコ…罪深いほどおいしいりす。\nただ、生チョコ系だから食べ過ぎには注意りすよ。詳しくは [ロバ菓子司の公式情報はこちらりす](" + link + ") 。"
        : "Kuranama is a seriously honest sweet-risu: 100% Hokkaido wheat + beet sugar, no preservatives✨ Just don't overdo it-risu.\n[Official info here-risu](" + link + ")",
        expression: "happy", context: keep };
    }
    return { mode: "reply", text: ja
      ? "それ、「蔵生（くらなま）」だりす！\n旭川のロバ菓子司が作る、生チョコをサンドしたサクサクしっとりのクッキーだりす✨ 北海道産小麦粉＋ビートグラニュー糖100%・保存料不使用で、素材へのこだわりが半端ないりす。\n旭川駅ビルやお土産店で買えるりすよ。詳しくは [ロバ菓子司の公式情報はこちらりす](" + link + ") 。"
      : "That's \"Kuranama\"-risu! A soft cookie with nama-chocolate from Roba Kashi-tsukasa in Asahikawa✨\n[Official info here-risu](" + link + ")",
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
      const spotNote = brandSpots.length > 0 ? (ja ? "\n🛍️ " + brandSpots.join("・") + "などで買えるりす" : "\n🛍️ Available at " + brandSpots.join(", ") + "-risu") : "";
      return { mode: "reply", text: (ja
        ? brandHit + "のおすすめ商品はこのあたりりす✨\n\n" + formatItemsCompare(shownBrand, ja) + kcalFooter(shownBrand, ja) + spotNote + shopMapLink(brandItems[0], ja)
        : "Top picks from " + brandHit + "-risu✨\n\n" + formatItemsCompare(shownBrand, ja) + kcalFooter(shownBrand, ja) + spotNote) + findCommunityNote(brandHit, communityPosts, ja),
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
    ? (ja ? "\n他には「" + strong.slice(1).map(m => m.name).join("」「") + "」もあるりす。" : "\nAlso: " + strong.slice(1).map(m => m.name).join(", ") + ".")
    : "";
  const contentsNote = top.contents ? (ja ? "\n📦 " + top.contents : "\n📦 " + top.contents) : "";
  const text = ja
    ? "「" + top.name + "」がおすすめりす。\n" + top.shop + "（" + top.region + "）で買えて、価格帯は" + top.price + (top.kcalNote ? "  🔥" + top.kcalNote : "") + contentsNote + "\n特徴は" + (top.tags || []).slice(0, 4).join("・") + "だりす✨" + others + "\n「どこで買える？」「いくら？」「カロリーは？」って続けて聞いてくれてもいいりす。" + findCommunityNote(top.name, communityPosts, ja)
    : "I'd recommend \"" + top.name + "\"-risu.\nAt " + top.shop + " (" + top.region + "), " + top.price + (top.kcalNote ? "  🔥" + top.kcalNote : "") + contentsNote + "\nKnown for: " + (top.tags || []).slice(0, 4).join(", ") + "✨" + others + findCommunityNote(top.name, communityPosts, ja);
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
const AFFILIATE = { amazonTag: "", rakutenId: "" };

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
    ? "\n🗺️ [Googleマップで見るりす](" + url + ")"
    : "\n🗺️ [See on Google Maps-risu](" + url + ")";
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
  return ja ? "\n\n🔥の数値は目安だから、商品パッケージの表示も確認してほしいりす。" : "\nNumbers are estimates — check packages-risu.";
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
      ? "ダイエット中なら、正直に言うりす：生チョコ系はおいしいぶん脂質高めだから量に注意りす。\nかわりのヘルシー系は、この2つが比べやすいりす💪\n\n" + formatItemsCompare(picks, ja) + "\n\n地域名や「新千歳空港」「札幌駅」みたいな場所も一緒に言ってくれたら、そこ限定で探すりす！"
      : "On a diet? Honest take-risu: nama-choco sweets are high in fat.\nHealthier picks-risu💪\n\n" + formatItemsCompare(picks, ja) + "\n\nAdd a region, airport, or station and I\'ll narrow it down-risu!",
      expression: "happy", context: keep };
  }
  const healthy = SOUVENIR_DB.filter(s => s.region === region && (s.tags || []).some(tg => HEALTHY_TAG_RE.test(tg)));
  if (healthy.length > 0) {
    keep.lastItemId = healthy[0].id;
    const picks3 = healthy.slice(0, 3);
    return { mode: "reply", text: ja
      ? region + "でダイエット中に選ぶなら、これが比べやすいりす💪\n\n" + formatItemsCompare(picks3, ja) + kcalFooter(picks3, ja) + "\n無理せず楽しくがいちばんりす！"
      : "Diet-friendly picks in " + region + "-risu💪\n\n" + formatItemsCompare(picks3, ja) + kcalFooter(picks3, ja),
      expression: "happy", context: keep };
  }
  return { mode: "reply", text: ja
    ? "正直に言うと、" + region + "のヘルシー系お土産は、まだ僕のデータには無いりす…🙏\n他の地域や新千歳空港でもよければ、🍬北見ハッカ飴や🌿がごめ昆布スナック（函館）がヘルシー系の定番りす！"
    : "Being honest, no healthy picks for " + region + " in my data yet-risu…🙏 If New Chitose Airport or other areas work, Kitami Mint Candy and Gagome Kombu Snack are the healthy classics-risu!",
    expression: "concerned", context: keep };
}


function describeItem(item, lang) {
  return lang === "ja"
    ? item.emoji + " 「" + item.name + "」だりすね！\n" + item.region + "の" + item.shop + "で買える、" + (item.tags || []).slice(0, 4).join("・") + "が特徴のお土産だりす。価格帯は" + item.price + "りす✨"
    : item.emoji + " \"" + item.name + "\"-risu! From " + item.shop + " in " + item.region + ". Features: " + (item.tags || []).slice(0, 4).join(", ") + ". " + item.price + "-risu✨";
}

// ══════════════════════════════════════════════════
// ナビゲーションの順序定義（スワイプ切替に使用）
const NAV_ORDER = ["home", "search", "post", "gift", "me"];
// ナビゲーションのメタ情報（絵文字・ラベルキー）
const NAV_META = [
  { nav: "home",   emoji: "🏠" },
  { nav: "search", emoji: "🐿️" },
  { nav: "post",   emoji: "✍️" },
  { nav: "gift",   emoji: "🎁" },
  { nav: "me",     emoji: "👤" },
];

// ── デスクトップ判定フック ──────────────────────────────────────────────────
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
  const host = lang === "ja" ? "https://ja.wikipedia.org" : "https://en.wikipedia.org";
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
  // ここりすが生成するのはhttps://のみだが、念のため全チャンネルで検証
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
    parts.push(<a key={"lk-" + k++} href={safeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3D7CB8", textDecoration: "underline", fontWeight: "bold" }}>{m[1]}</a>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ══════════════════════════════════════════════════
// 投稿1件あたりの最大文字数
const MAX_REVIEW_LENGTH = 1000;

// 🚫 ここりすチェック
// ══════════════════════════════════════════════════
const NG_WORDS = [
  "クソ", "くそ", "糞", "ゴミ", "ごみ", "最悪", "最低", "死ね", "しね", "殺", "バカ", "ばか", "馬鹿", "アホ", "あほ",
  "うざい", "ウザい", "ウザ", "きもい", "キモい", "キモ", "ふざけんな", "ふざけるな", "むかつく", "ムカつく", "ムカ",
  "ざけんな", "ありえない", "詐欺", "ぼったくり", "ボッタクリ", "二度と買わない", "金返せ",
  "shit", "fuck", "fck", "damn", "crap", "stupid", "idiot", "hate this", "ugly", "awful", "terrible", "worst", "scam", "trash", "garbage",
];

function cocorisuCheck(text, lang) {
  const trimmed = (text || "").trim();
  const ja = lang === "ja";
  if (!trimmed) return { status: "pending", feedback: "" };
  if (trimmed.length < 10) {
    return { status: "ng", feedback: ja
      ? "もう少しだけ詳しく書いてほしいりす！\n\n😊 良いところ：書き始めてくれてありがとうりす！その一歩が大事りす！\n✏️ 直してほしいところ：今は" + trimmed.length + "文字だりす。「なぜ選んだか」「どんな反応だったか」を1行足すだけで、ぐっと参考になるレビューになるりす〜"
      : "Just a bit more-risu!\n\n😊 Good: You started writing-risu!\n✏️ Fix: " + trimmed.length + " chars now — add why you chose it or the reaction-risu~" };
  }
  const lower = text.toLowerCase();
  const foundNg = NG_WORDS.find(w => lower.includes(w.toLowerCase()));
  if (foundNg) {
    return { status: "ng", feedback: ja
      ? "ちょっと待ってほしいりす！🙏\n\n😊 良いところ：しっかり気持ちを言葉にできているのは素敵だりす！正直な感想はレビューの宝だりす！\n✏️ 直してほしいところ：「" + foundNg + "」という表現は、読んだ人が悲しい気持ちになっちゃうかもだりす…。「期待とは少し違った」「私の好みには合わなかった」みたいに言い換えてもらえると嬉しいりす🕊️"
      : "Hold on-risu!🙏\n\n😊 Good: Honest feelings are the treasure of a review-risu!\n✏️ Fix: \"" + foundNg + "\" might sting readers-risu… try \"didn't meet my expectations\" instead-risu🕊️" };
  }
  const hasPositive = /(よかっ|嬉し|うれし|喜ん|よろこ|おいし|美味し|最高|素晴|すばら|感動|ありがと|笑顔|great|good|loved|happy|delicious|amazing|wonderful|perfect|smile)/i.test(text);
  const hasDetail = /(買|購入|駅|空港|店|オンライン|ネット|手作り|作れ|bought|store|station|online|shop|made)/i.test(text);
  let praise = ja ? "具体的な体験が書けていて、とても読みやすいりす！" : "Clear, concrete experience-risu!";
  if (hasPositive && hasDetail) praise = ja ? "気持ちのこもった言葉と、入手方法の情報が両方入ってて、パーフェクトなレビューだりす！" : "Heartfelt words AND how to get it — perfect-risu!";
  else if (hasPositive) praise = ja ? "気持ちの言葉が入ってて、あったかいレビューだりす！" : "Warm, heartfelt words-risu!";
  else if (hasDetail) praise = ja ? "入手方法の情報があって、次の人の役に立つりす！" : "Purchase info — super helpful-risu!";
  return { status: "ok", feedback: ja
    ? "✅ 合格りす！このまま投稿できるりす✨\n\n😊 " + praise + "\n🌟 この調子で、次の誰かのギフト選びを助けてあげてほしいりす！"
    : "✅ Passed-risu! Ready to post✨\n\n😊 " + praise + "\n🌟 Go help someone find their next gift-risu!" };
}

// ══════════════════════════════════════════════════
// 🧩 Header / AuthGate
// ══════════════════════════════════════════════════
function Header({ t, onToggleLang, isLoggedIn, userLv, userXp }) {
  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Cocorisu size={30} />
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#3D7CB8", fontFamily: "'Zen Maru Gothic','Hiragino Maru Gothic ProN','BIZ UDGothic',sans-serif", letterSpacing: "1.5px" }}>まごころ</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {isLoggedIn && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#EEF2F6", padding: "3px 9px", borderRadius: "20px", fontSize: "12px" }}>
            <span style={{ fontWeight: "bold", color: "#3D7CB8" }}>{t.levelLabel}{userLv}</span>
            <div style={{ width: "44px", height: "5px", background: "#CBD5E1", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: userXp + "%", height: "100%", background: "linear-gradient(90deg,#5B9BD5,#7FB5E5)", transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontSize: "10px", color: "#64748B" }}>{userXp}/100</span>
          </div>
        )}
        <button onClick={onToggleLang} style={{ background: "#3D7CB8", color: "#fff", border: "none", padding: "5px 11px", borderRadius: "14px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}>{t.switchLabel}</button>
      </div>
    </header>
  );
}

function AuthGate({ t, hatomono, authStep, loginId, password, recoveryQ, recoveryA, authError, isSubmitting, lastAction,
  onChangeLoginId, onChangePassword, onChangeRecoveryQ, onChangeRecoveryA, onLineLogin, onGotoSignup, onGotoLogin, onSubmit, onFinalizeLogin }) {
  return (
    <div style={{ maxWidth: "420px", margin: "40px auto", padding: "24px", background: "#fff", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", textAlign: "center", animation: "fadeInUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}><Cocorisu size={100} expression={hatomono} /></div>
      {authStep === "welcome" && (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.authTagline}</h2>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px 0" }}>{t.authSubtitle}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button onClick={onLineLogin} disabled={isSubmitting} style={{ width: "100%", background: "#06C755", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, fontSize: "14px" }}>
              {isSubmitting ? t.authSubmitting : t.authLineBtn}
            </button>
            <button onClick={onGotoSignup} disabled={isSubmitting} style={{ width: "100%", background: "#F8FAFC", color: "#334155", border: "1px solid #CBD5E1", padding: "13px", borderRadius: "10px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, fontSize: "14px" }}>
              {t.authIdpassBtn}
            </button>
          </div>
        </div>
      )}
      {(authStep === "signup_id" || authStep === "login_id") && (
        <div style={{ textAlign: "left" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", textAlign: "center" }}>{authStep === "signup_id" ? t.authIdpassBtn : t.authLoginLink}</h3>
          {authError && <p style={{ color: "#EF4444", fontSize: "12px", marginBottom: "12px", background: "#FEF2F2", padding: "8px", borderRadius: "6px" }}>⚠️ {authError}</p>}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{t.authLoginId}</label>
            <input type="text" value={loginId} onChange={e => onChangeLoginId(e.target.value)} placeholder={t.authLoginIdHint} style={{ width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "6px", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{t.authPassword}</label>
            <input type="password" value={password} onChange={e => onChangePassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSubmit(e); } }} placeholder="••••••••" style={{ width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "6px", boxSizing: "border-box" }} />
          </div>
          {authStep === "signup_id" && (
            <div style={{ marginBottom: "20px", background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px dashed #CBD5E1" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#475569" }}>{t.authRecoveryTitle}</label>
              <p style={{ fontSize: "10px", color: "#64748B", margin: "0 0 8px 0" }}>{t.authRecoveryHint}</p>
              <select value={recoveryQ} onChange={e => onChangeRecoveryQ(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "12px", marginBottom: "8px" }}>
                <option value="">{t.authRecoverySelectPh}</option>
                {(t.recoveryPresets || []).map((q, i) => <option key={i} value={q}>{q}</option>)}
              </select>
              <input type="text" value={recoveryA} onChange={e => onChangeRecoveryA(e.target.value)} placeholder={t.authRecoveryAnswer} style={{ width: "100%", padding: "8px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }} />
            </div>
          )}
          <button type="button" onClick={onSubmit} disabled={isSubmitting} style={{ width: "100%", background: isSubmitting ? "#A9C7E6" : "#5B9BD5", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", marginBottom: "12px" }}>
            {isSubmitting ? t.authSubmitting : authStep === "signup_id" ? t.authSubmitSignupId : t.authSubmitLoginId}
          </button>
          <div style={{ textAlign: "center", fontSize: "12px", color: "#64748B" }}>
            {authStep === "signup_id"
              ? <span>{t.authSwitchToLogin} <a href="#" onClick={e => { e.preventDefault(); onGotoLogin(); }} style={{ color: "#3D7CB8", fontWeight: "bold" }}>{t.authLoginLink}</a></span>
              : <span>{t.authSwitchToSignup} <a href="#" onClick={e => { e.preventDefault(); onGotoSignup(); }} style={{ color: "#3D7CB8", fontWeight: "bold" }}>{t.authSignupLink}</a></span>}
          </div>
        </div>
      )}
      {authStep === "success" && (
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#4A7C6F", marginBottom: "8px" }}>{lastAction === "login" ? t.authCocorisuWelcomeBack : t.authSuccessTitle}</h3>
          <p style={{ fontSize: "14px", color: "#475569", marginBottom: "24px" }}>{lastAction === "login" ? t.authWelcomeBackBody : t.authSuccessBody}</p>
          <button onClick={onFinalizeLogin} style={{ background: "#5B9BD5", color: "#fff", border: "none", padding: "12px 32px", borderRadius: "24px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 4px 12px rgba(91,155,213,0.3)" }}>{t.authSuccessCta}</button>
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

function PostCard({ t, post, distance, isFollowing, onLike, onToggleFollow, onOpenQuote, onAddComment, onAddReply }) {
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
    <div style={{ background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", animation: "fadeInUp 0.4s ease" }}>
      {post.photoUrl && (
        <div style={{ width: "100%", height: "180px", overflow: "hidden", background: "#F0F4F8" }}>
          <img src={post.photoUrl} alt={post.giftName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.currentTarget.parentElement.style.display = "none"; }} />
        </div>
      )}
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: post.avatarColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}>{post.userAvatar}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.userName}</div>
              <div style={{ fontSize: "10px", color: "#A0AEC0" }}>{post.createdAt} • {post.locationName}{distance != null && <span style={{ color: "#5B9BD5", marginLeft: "4px" }}>📍 {distance}{t.distanceUnit}</span>}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {!isMine && (
              <button onClick={() => onToggleFollow(post.userName)}
                style={{ fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "14px", cursor: "pointer", border: isFollowing ? "1px solid #CBD5E1" : "none", background: isFollowing ? "#F1F5F9" : "#5B9BD5", color: isFollowing ? "#64748B" : "#fff", transition: "all 0.15s" }}>
                {isFollowing ? t.followingBtn : t.followBtn}
              </button>
            )}
            <span style={{ fontSize: "11px", background: "#EDF2F7", padding: "3px 8px", borderRadius: "4px", color: "#4A5568", fontWeight: "500", whiteSpace: "nowrap" }}>{post.category}</span>
          </div>
        </div>

        {isThanks && <div style={{ display: "inline-block", fontSize: "11px", fontWeight: "bold", color: "#C2708E", background: "#FDEBF2", padding: "3px 10px", borderRadius: "12px", marginBottom: "10px" }}>{t.thanksLabel}</div>}

        <div style={{ display: "flex", gap: "12px", background: "#F8FAFC", padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: post.giftBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>{post.giftEmoji}</div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 2px 0" }}>{post.giftName}</h4>
            <p style={{ fontSize: "11px", color: "#718096", margin: 0 }}>{t.toLabel}<span style={{ color: "#2D2926", fontWeight: "500" }}>{post.recipient}</span> | {post.scene}</p>
            <p style={{ fontSize: "11px", color: "#718096", margin: 0 }}>{t.priceLabel}: <span style={{ color: "#E8A87C", fontWeight: "bold" }}>{post.price}</span></p>
          </div>
        </div>

        {post.quoted && (
          <div style={{ border: "1.5px solid #D8E4F0", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px", background: "#FAFCFF" }}>
            <p style={{ fontSize: "10px", fontWeight: "bold", color: "#7B94AC", margin: "0 0 4px 0" }}>{isThanks ? t.thanksLabel : t.quotedLabel} — @{post.quoted.userName}</p>
            <p style={{ fontSize: "12px", margin: 0, color: "#4A5568" }}>{post.quoted.giftEmoji} <b>{post.quoted.giftName}</b></p>
            {post.quoted.snippet && <p style={{ fontSize: "11px", margin: "3px 0 0 0", color: "#718096" }}>“{post.quoted.snippet}”</p>}
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
            <p style={{ fontSize: "13px", lineHeight: "1.65", margin: 0, color: "#2D2926", whiteSpace: "pre-line" }}>{p.note}</p>
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

        {/* 📦 この投稿を見て「自分も誰かに贈りたい」と思った人のための導線（DB商品と確実に一致した時だけ） */}
        {(() => { const dbi = findDbItemForPost(post.giftName); return dbi ? (
          <a href={amazonSearchUrl(dbi.name)} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#B45309", background: "#FFF7ED", border: "1px dashed #FDBA74", borderRadius: "8px", padding: "7px", marginBottom: "12px", textDecoration: "none" }}>{t.otoriyosePostPrefix}{dbi.name}{t.otoriyosePostSuffix}</a>
        ) : null; })()}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #EDF2F7", paddingTop: "10px", fontSize: "12px", color: "#718096", flexWrap: "wrap", gap: "6px" }}>
          <button onClick={() => onLike(post.id)} style={{ background: "none", border: "none", color: post.liked ? "#EF4444" : "#718096", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>{post.liked ? "❤️" : "🤍"} {post.likes}</button>
          <button onClick={() => setShowComments(s => !s)} style={{ background: "none", border: "none", color: showComments ? "#3D7CB8" : "#718096", cursor: "pointer", fontSize: "12px", fontWeight: showComments ? "bold" : "normal" }}>💬 {cCount}</button>
          <button onClick={() => onOpenQuote(post, "thanks")} style={{ background: "none", border: "none", color: "#C2708E", cursor: "pointer", fontSize: "12px" }}>{t.thanksBtn}</button>
          <button onClick={() => onOpenQuote(post, "quote")} style={{ background: "none", border: "none", color: "#3D7CB8", cursor: "pointer", fontSize: "12px" }}>{t.quoteBtn}</button>
        </div>

        {showComments && (
          <div style={{ marginTop: "12px", background: "#F8FAFC", borderRadius: "10px", padding: "12px", animation: "fadeInUp 0.25s ease" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", margin: "0 0 10px 0" }}>💬 {t.commentsTitle}（{cCount}）</p>
            {(post.commentList || []).length === 0 && <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 10px 0" }}>{t.noComments}</p>}
            {(post.commentList || []).map(c => (
              <div key={c.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: c.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "11px", flexShrink: 0 }}>{c.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ background: "#fff", borderRadius: "10px", padding: "8px 10px", border: "1px solid #E9EEF4" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold" }}>{c.name}</span>
                      <span style={{ fontSize: "9px", color: "#A0AEC0", marginLeft: "6px" }}>{c.time}</span>
                      <p style={{ fontSize: "12px", margin: "3px 0 0 0", lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                    <button onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyInput(""); }}
                      style={{ background: "none", border: "none", fontSize: "10px", color: "#3D7CB8", cursor: "pointer", fontWeight: "bold", padding: "3px 4px" }}>↩ {t.replyBtn}</button>
                    {(c.replies || []).map(r => (
                      <div key={r.id} style={{ display: "flex", gap: "6px", marginTop: "6px", marginLeft: "10px" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: r.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "10px", flexShrink: 0 }}>{r.avatar}</div>
                        <div style={{ background: "#fff", borderRadius: "10px", padding: "7px 10px", border: "1px solid #E9EEF4", flex: 1 }}>
                          <span style={{ fontSize: "10px", fontWeight: "bold" }}>{r.name}</span>
                          <span style={{ fontSize: "9px", color: "#A0AEC0", marginLeft: "6px" }}>{r.time}</span>
                          <p style={{ fontSize: "11px", margin: "2px 0 0 0", lineHeight: 1.5 }}>{r.text}</p>
                        </div>
                      </div>
                    ))}
                    {replyingTo === c.id && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px", marginLeft: "10px" }}>
                        <input type="text" value={replyInput} onChange={e => setReplyInput(e.target.value)} placeholder={t.replyPh}
                          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submitReply(c.id); } }}
                          style={{ flex: 1, padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: "14px", fontSize: "11px", outline: "none", minWidth: 0 }} />
                        <button onClick={() => submitReply(c.id)} style={{ background: "#5B9BD5", color: "#fff", border: "none", padding: "0 12px", borderRadius: "14px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>{t.commentSend}</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <input type="text" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder={t.commentPh}
                onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submitComment(); } }}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: "16px", fontSize: "12px", outline: "none", minWidth: 0 }} />
              <button onClick={submitComment} style={{ background: "#5B9BD5", color: "#fff", border: "none", padding: "0 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.commentSend}</button>
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
  reviewReason, reviewReaction, reviewNote, reviewHeart, onChangeReviewPart,
  combinedReview, photoUrl, onPickPhotoFile, onSamplePhoto, checkResult, hatomono, onSubmit, canSubmit }) {

  const fileInputRef = useRef(null);
  const fieldStyle = { width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "13px", resize: "none", boxSizing: "border-box", lineHeight: 1.5, fontFamily: "inherit" };
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
          <p style={{ fontSize: "12px", margin: 0, color: "#4A5568" }}>{quoteTarget.giftEmoji} <b>{quoteTarget.giftName}</b></p>
          {quoteTarget.snippet && <p style={{ fontSize: "11px", margin: "3px 0 0 0", color: "#718096" }}>“{quoteTarget.snippet}”</p>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label style={labelStyle}>{t.giftNameLabel}</label>
          <input type="text" value={giftName} onChange={e => onChangeGiftName(e.target.value)} placeholder={t.giftNamePh} style={{ width: "100%", padding: "9px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={labelStyle}>{t.categoryLabel}</label>
          <select value={category} onChange={e => onChangeCategory(e.target.value)} style={{ width: "100%", padding: "9px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "13px" }}>
            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {scenes && recipients && prices && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.sceneLabel}</label>
            <select value={scene} onChange={e => onChangeScene(e.target.value)} style={{ width: "100%", padding: "7px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "11px" }}>
              {scenes.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.recipientLabel}</label>
            <select value={recipient} onChange={e => onChangeRecipient(e.target.value)} style={{ width: "100%", padding: "7px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "11px" }}>
              {recipients.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.priceLabel}</label>
            <select value={price} onChange={e => onChangePrice(e.target.value)} style={{ width: "100%", padding: "7px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "11px" }}>
              {prices.map((p, i) => <option key={i} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

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
        <textarea value={reviewHeart} onChange={e => onChangeReviewPart("reviewHeart", e.target.value)} placeholder={t.reviewHeartPh} rows={2} style={{ ...fieldStyle, background: "#fff" }} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhotoFile} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{ flex: 1, background: photoUrl ? "#F0FDF4" : "#F8FAFC", border: photoUrl ? "1.5px solid #86EFAC" : "1.5px dashed #CBD5E1", padding: "11px 14px", borderRadius: "10px", fontSize: "13px", cursor: "pointer", color: photoUrl ? "#16A34A" : "#475569", fontWeight: "bold", textAlign: "left", transition: "all 0.2s" }}>
            {photoUrl ? t.photoSelected : t.photoBtn}
          </button>
          <button type="button" onClick={onSamplePhoto}
            style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", padding: "0 12px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", color: "#64748B", fontWeight: "bold", flexShrink: 0 }}>
            {t.samplePhotoBtn}
          </button>
        </div>
        {photoUrl && <img src={photoUrl} alt="preview" style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "10px", marginTop: "8px", border: "1px solid #E2E8F0", animation: "fadeInUp 0.3s ease" }} />}
      </div>

      <div style={{ background: statusBg, border: "2.5px solid " + statusBorder, borderRadius: "14px", padding: "14px", marginBottom: "16px", transition: "all 0.4s ease", boxShadow: "0 2px 12px " + statusBorder + "33" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: combinedReview ? "12px" : 0, paddingBottom: combinedReview ? "10px" : 0, borderBottom: combinedReview ? "1.5px dashed " + statusBorder : "none" }}>
          <Cocorisu size={46} expression={hatoFace} />
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
        style={{ width: "100%", background: canSubmit ? "linear-gradient(135deg,#5B9BD5,#3D7CB8)" : "#CBD5E1", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "bold", cursor: canSubmit ? "pointer" : "not-allowed", fontSize: "14px", transition: "all 0.25s", boxShadow: canSubmit ? "0 4px 14px rgba(91,155,213,0.4)" : "none" }}>
        {t.submitBtn}
      </button>
      {combinedReview && (
        <p style={{ fontSize: "11px", color: combinedReview.length > MAX_REVIEW_LENGTH ? "#EF4444" : "#94A3B8", textAlign: "center", margin: "8px 0 0 0" }}>
          {combinedReview.length} / {MAX_REVIEW_LENGTH}文字
          {combinedReview.length > MAX_REVIEW_LENGTH && " — 長すぎるりす、少し短くしてほしいりす🙏"}
        </p>
      )}
      {!canSubmit && combinedReview && combinedReview.length <= MAX_REVIEW_LENGTH && <p style={{ fontSize: "11px", color: "#94A3B8", textAlign: "center", margin: "8px 0 0 0" }}>{t.checkGateNote}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🧩 HomePanel / SearchPanel / MePanel
// ══════════════════════════════════════════════════
function HomePanel({ t, isDesktop, posts, feedMode, following, selectedCategory, postSearchQuery, userLocation, isLocating, locationNote, demoOrigin, calcDist, dispatch, A, onOpenQuote }) {
  const q = postSearchQuery.trim().toLowerCase();
  const filtered = posts.filter(p => {
    if (feedMode === "following" && !following.includes(p.userName) && p.userName !== t.myName) return false;
    const mc = selectedCategory === "すべて" || selectedCategory === "All" || p.category === selectedCategory;
    const body = ((p.parts && (p.parts.reason + p.parts.reaction + p.parts.note + (p.parts.heart || ""))) || p.review || "").toLowerCase();
    const mq = !q || p.giftName.toLowerCase().includes(q) || body.includes(q);
    return mc && mq;
  });
  const origin = userLocation || demoOrigin;
  return (
    <div style={{ maxWidth: isDesktop ? "980px" : "600px", margin: "0 auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ background: "linear-gradient(135deg,#5B9BD5 0%,#3D7CB8 100%)", color: "#fff", padding: isDesktop ? "36px" : "24px", borderRadius: "18px", boxShadow: "0 6px 20px rgba(61,124,184,0.25)" }}>
        <h2 style={{ fontSize: isDesktop ? "28px" : "22px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.heroTitle}{t.heroSub}</h2>
        <p style={{ fontSize: "13px", opacity: 0.9, margin: "0 0 16px 0" }}>{t.heroDesc}</p>
        <button onClick={() => dispatch({ type: A.OPEN_POST_MODAL })} style={{ background: "#FFAB76", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "22px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>{t.postBtn}</button>
      </div>
      <div style={{ background: "#fff", padding: "14px 16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>{t.nearbyBtn}</span>
          <button onClick={() => dispatch({ type: A.LOCATE_REQUEST })} disabled={isLocating} style={{ background: "#EEF2F6", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", color: "#3D7CB8", fontWeight: "bold" }}>{isLocating ? t.locating : t.locateBtn}</button>
        </div>
        {locationNote && <p style={{ fontSize: "12px", color: "#4A7C6F", margin: "6px 0 0 0" }}>✓ {locationNote}</p>}
        {!userLocation && <p style={{ fontSize: "11px", color: "#718096", margin: "6px 0 0 0" }}>💡 {t.nearbyFallbackNote}</p>}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {[["all", t.feedAll], ["following", t.feedFollowing]].map(([mode, label]) => (
          <button key={mode} onClick={() => dispatch({ type: A.SET_FEED_MODE, payload: mode })}
            style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", background: feedMode === mode ? "#3D7CB8" : "#fff", color: feedMode === mode ? "#fff" : "#4A5568", fontSize: "12px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s" }}>
            {label}{mode === "following" && following.length > 0 ? `（${following.length}）` : ""}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {t.categories.map((cat, i) => (
          <button key={i} onClick={() => dispatch({ type: A.SET_CATEGORY_FILTER, payload: cat })}
            style={{ whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "15px", border: "none", background: selectedCategory === cat ? "#5B9BD5" : "#fff", color: selectedCategory === cat ? "#fff" : "#4A5568", fontSize: "12px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s" }}>{cat}</button>
        ))}
      </div>
      <input type="text" value={postSearchQuery} onChange={e => dispatch({ type: A.SET_POST_SEARCH_QUERY, payload: e.target.value })} placeholder={t.postSearchPlaceholder}
        style={{ width: "100%", padding: "11px 14px", border: "1px solid #CBD5E1", borderRadius: "12px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#fff" }} />
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#94A3B8" }}>
          <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 4px 0" }}>{feedMode === "following" && following.length === 0 ? t.feedFollowingEmpty : t.noMatchTitle}</p>
          {!(feedMode === "following" && following.length === 0) && <p style={{ fontSize: "12px", margin: 0 }}>{t.noMatchDesc}</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: "16px", alignItems: "start" }}>
          {filtered.map(post => (
            <PostCard key={post.id} t={t} post={post}
              distance={calcDist(origin.lat, origin.lng, post.lat, post.lng)}
              isFollowing={following.includes(post.userName)}
              onLike={async (id) => {
                    const post = stateRef.current.posts.items.find(p => p.id === id);
                    dispatch({ type: A.TOGGLE_LIKE, payload: id });
                    if (post && !id.startsWith("optimistic_")) await postService.toggleLike(id, post.liked);
                  }}
              onToggleFollow={name => dispatch({ type: A.TOGGLE_FOLLOW, payload: name })}
              onOpenQuote={onOpenQuote}
              onAddComment={(postId, text) => dispatch({ type: A.ADD_COMMENT, payload: { postId, text } })}
              onAddReply={(postId, commentId, text) => dispatch({ type: A.ADD_REPLY, payload: { postId, commentId, text } })} />
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
      <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px dashed #E2E8F0" }}>
          <Cocorisu size={92} expression={hatomono} isTalking={isHatoTalking} />
          <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "6px 0 0 0" }}>🐿️ {t.chatTitle}</h3>
          <p style={{ fontSize: "10px", color: "#94A3B8", margin: 0, textAlign: "center" }}>{t.chatSub}</p>
        </div>
        {/* 🗂️ チャット履歴バー：新規作成と過去チャットの切替 */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          <button onClick={() => dispatch({ type: A.CHAT_NEW_SESSION })} style={{ flex: 1, background: "#5B9BD5", color: "#fff", border: "none", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.chatNewBtn}</button>
          <button onClick={() => dispatch({ type: A.CHAT_TOGGLE_HISTORY })} style={{ flex: 1, background: showHistory ? "#3D7CB8" : "#F1F5F9", color: showHistory ? "#fff" : "#475569", border: "none", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.chatHistoryBtn}（{sessions.length}）</button>
        </div>
        {showHistory && (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "8px", marginBottom: "10px", maxHeight: "170px", overflowY: "auto", animation: "fadeInUp 0.2s ease" }}>
            {sessions.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 6px", borderRadius: "8px", background: s.id === activeId ? "#E3EEF9" : "transparent" }}>
                <button onClick={() => dispatch({ type: A.CHAT_SWITCH_SESSION, payload: s.id })} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#334155", fontWeight: s.id === activeId ? "bold" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "5px 2px" }}>💬 {s.title}</button>
                <button onClick={() => dispatch({ type: A.CHAT_DELETE_SESSION, payload: s.id })} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "13px", flexShrink: 0, padding: "2px 4px" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div ref={logRef} style={{ height: "450px", overflowY: "auto", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0", padding: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {chatLog.map((m, i) =>
            m.sender === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#5B9BD5", color: "#fff", padding: "10px 12px", borderRadius: "14px 14px 4px 14px", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-line", animation: "fadeInUp 0.25s ease" }}>{m.text}</div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", display: "flex", gap: "8px", maxWidth: "88%", animation: "fadeInUp 0.25s ease" }}>
                <div style={{ flexShrink: 0, marginTop: "2px" }}><Cocorisu size={30} expression={m.expression || "idle"} /></div>
                <div style={{ background: "#EEF6FC", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-line", color: "#2D2926", wordBreak: "break-word" }}>{renderChatText(m.text)}</div>
              </div>
            )
          )}
          {isSending && (
            <div style={{ alignSelf: "flex-start", display: "flex", gap: "8px" }}>
              <div style={{ flexShrink: 0, marginTop: "2px" }}><Cocorisu size={30} expression="thinking" /></div>
              <div style={{ background: "#EEF6FC", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>{isWebSearching ? t.chatSearchingWeb : t.chatThinking}</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {t.quickExamples.map((ex, i) => (
            <button key={i} onClick={() => dispatch({ type: A.SET_CHAT_INPUT, payload: ex })} style={{ background: "#F1F5F9", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", color: "#475569", cursor: "pointer" }}>💡 {ex}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input type="text" value={chatInput}
            onChange={e => dispatch({ type: A.SET_CHAT_INPUT, payload: e.target.value })}
            onKeyDown={onChatKeyDown}
            placeholder={t.chatPlaceholder}
            style={{ flex: 1, padding: "11px 14px", border: "1px solid #CBD5E1", borderRadius: "24px", fontSize: "13px", outline: "none", minWidth: 0 }} />
          <button onClick={onSendChat} disabled={isSending || !chatInput.trim()}
            style={{ background: (isSending || !chatInput.trim()) ? "#A9C7E6" : "#5B9BD5", color: "#fff", border: "none", padding: "0 18px", borderRadius: "24px", fontWeight: "bold", cursor: (isSending || !chatInput.trim()) ? "not-allowed" : "pointer", fontSize: "14px", transition: "background 0.2s", flexShrink: 0 }}>➔</button>
        </div>
      </div>
    </div>
  );
}

function GiftPanel({ t, isDesktop, dbSearchQuery, dispatch, A }) {
  return (
    <div style={{ maxWidth: isDesktop ? "760px" : "600px", margin: "0 auto", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <span style={{ fontSize: "22px" }}>🎁</span>
          <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>{t.dbTitle}</h3>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#94A3B8", background: "#F1F5F9", padding: "2px 8px", borderRadius: "20px" }}>{SOUVENIR_DB.length}件</span>
        </div>
        <input type="text" value={dbSearchQuery} onChange={e => dispatch({ type: A.SET_DB_SEARCH_QUERY, payload: e.target.value })} placeholder={t.dbSearchPlaceholder}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "12px", outline: "none", marginBottom: "6px", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "linear-gradient(135deg,#FFF9F0,#FFF3E8)", border: "1px solid #F0D0A0", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px" }}>
          <Cocorisu size={42} expression="happy" />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "11.5px", color: "#7C4A1E", margin: 0, lineHeight: 1.6, fontWeight: "bold" }}>{t.otoriyoseNote}</p>
            <p style={{ fontSize: "9.5px", color: "#B99B78", margin: "3px 0 0 0" }}>{t.otoriyoseAd}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
          {["全て", ...SOUVENIR_REGIONS].slice(0, 10).map(r => (
            <button key={r} onClick={() => dispatch({ type: A.SET_DB_SEARCH_QUERY, payload: r === "全て" ? "" : r })}
              style={{ background: dbSearchQuery === r || (r === "全て" && !dbSearchQuery) ? "#3D7CB8" : "#F1F5F9", color: dbSearchQuery === r || (r === "全て" && !dbSearchQuery) ? "#fff" : "#475569", border: "none", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontWeight: "bold", transition: "all 0.15s" }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: "10px" }}>
          {(dbSearchQuery.trim() ? matchSouvenirs(dbSearchQuery) : SOUVENIR_DB).length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center", padding: "12px 0", gridColumn: "1 / -1" }}>{t.dbSearchNoMatch}</p>
          ) : (
            (dbSearchQuery.trim() ? matchSouvenirs(dbSearchQuery) : SOUVENIR_DB).map(s => (
              <div key={s.id} style={{ padding: "10px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: 0 }}>
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{s.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1A3A5C" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "#718096" }}>{s.shop}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{s.region}{s.contents ? "・" + s.contents : ""}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "10px", background: "#FFAB76", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>{s.category}</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#E8A87C" }}>{s.price}</span>
                    {s.kcalNote && <span style={{ fontSize: "10px", color: "#16A34A", background: "#F0FDF4", padding: "1px 5px", borderRadius: "4px" }}>🔥{s.kcalNote}</span>}
                  </div>
                </div>
                {/* 📦 お取り寄せ導線＝どこでもドア（AFFILIATEにIDを入れるとアフィリエイトリンクに切り替わる） */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" }}>
                  <a href={amazonSearchUrl(s.name)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#B45309", background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: "6px", padding: "5px 0", textDecoration: "none" }}>{t.otoriyoseAmazon}</a>
                  <a href={rakutenSearchUrl(s.name)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#9F1239", background: "#FFF1F2", border: "1px solid #FDA4AF", borderRadius: "6px", padding: "5px 0", textDecoration: "none" }}>{t.otoriyoseRakuten}</a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MePanel({ t, userLv, userXp, loginId, followingCount, onLogout }) {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #E2E8F0", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#5B9BD5,#3D7CB8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", margin: "0 auto 12px auto" }}>{t.myAvatar}</div>
        <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.myName}</h3>
        <p style={{ fontSize: "12px", color: "#718096", margin: "0 0 6px 0" }}>{t.memberIdLabel} {loginId || "LINE_USER_4592"}</p>
        <p style={{ fontSize: "12px", color: "#3D7CB8", fontWeight: "bold", margin: "0 0 16px 0" }}>👥 {t.followingCountLabel}: {followingCount}</p>
        <div style={{ background: "#F1F5F9", padding: "16px", borderRadius: "12px", maxWidth: "300px", margin: "0 auto 24px auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
            <span>{t.rankLabel}</span>
            <span style={{ fontWeight: "bold", color: "#3D7CB8" }}>{t.levelLabel}{userLv} {t.rankName}</span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "#CBD5E1", borderRadius: "4px", overflow: "hidden", marginBottom: "6px" }}>
            <div style={{ width: userXp + "%", height: "100%", background: "linear-gradient(90deg,#5B9BD5,#7FB5E5)", transition: "width 0.6s ease" }} />
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", textAlign: "right" }}>{t.nextLevelBefore} {100 - userXp} {t.xpLabel}</div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid #EF4444", color: "#EF4444", padding: "8px 24px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>{t.authLogout}</button>
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
  AUTH_FINALIZE: "AUTH_FINALIZE", AUTH_LOGOUT: "AUTH_LOGOUT", SESSION_CHECK_DONE: "SESSION_CHECK_DONE",
  SET_TIMELINE: "SET_TIMELINE",
  AWARD_XP: "AWARD_XP", HIDE_XP_ALERT: "HIDE_XP_ALERT",
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
};

// 💬 チャットセッション（Claude/Gemini式の履歴管理）
const CHAT_STORAGE_KEY = "magokoro_chat_sessions";
// 投稿はFirestoreで管理するためAPP_STORAGE_KEYは不要
function makeChatSession(lang) {
  return { id: "cs" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: LANG[lang].chatDefaultTitle, log: [{ sender: "hato", text: LANG[lang].chatWelcome, expression: "happy" }], context: { lastRegion: null }, createdAt: Date.now() };
}
const _initialChatSession = makeChatSession("ja");

const initialState = {
  ui: { lang: "ja", currentNav: "home" },
  auth: { isLoggedIn: false, isCheckingSession: true, isSubmitting: false, step: "welcome", lastAction: null, loginId: "", password: "", recoveryQ: "", recoveryA: "", error: "", currentUser: null },
  gamification: { level: 1, xp: 15, showXpAlert: false },
  posts: { items: [], selectedCategory: "すべて", searchQuery: "", feedMode: "all" },
  social: { following: ["Haruka_M"] },
  location: { userLocation: null, isLocating: false, note: "" },
  cocorisu: { expression: "idle", isTalking: false },
  chat: { input: "", sessions: [_initialChatSession], activeId: _initialChatSession.id, isSending: false, isWebSearching: false, showHistory: false },
  db: { searchQuery: "" },
  postForm: { modalOpen: false, mode: "normal", quoteTarget: null, giftName: "", category: LANG.ja.categories[1], reviewReason: "", reviewReaction: "", reviewNote: "", reviewHeart: "", scene: "", recipient: "", price: "", photoUrl: null, checkResult: { status: "pending", feedback: "" } },
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
      if (d2 && d2.gamification && typeof d2.gamification.xp === "number") st = { ...st, gamification: { ...st.gamification, level: d2.gamification.level || 1, xp: d2.gamification.xp } };
    }
  } catch (_) { /* noop */ }
  return st;
}

function reducer(state, action) {
  switch (action.type) {
    case A.SET_LANG: {
      const l = action.payload;
      return { ...state, ui: { ...state.ui, lang: l },
        posts: { ...state.posts, selectedCategory: l === "ja" ? "すべて" : "All", feedMode: "all" },
        social: { following: [] },
        postForm: { ...state.postForm, category: LANG[l].categories[1], checkResult: cocorisuCheck([state.postForm.reviewReason, state.postForm.reviewReaction, state.postForm.reviewNote].filter(Boolean).join("\n"), l) },
        chat: { ...state.chat, input: "", isSending: false, isWebSearching: false, showHistory: false } };
    }
    case A.SET_NAV: return { ...state, ui: { ...state.ui, currentNav: action.payload } };
    case A.AUTH_GOTO_STEP: return { ...state, auth: { ...state.auth, step: action.payload, error: "", lastAction: action.payload === "signup_id" ? "signup" : action.payload === "login_id" ? "login" : state.auth.lastAction } };
    case A.AUTH_SET_LOGIN_ID: return { ...state, auth: { ...state.auth, loginId: action.payload } };
    case A.AUTH_SET_PASSWORD: return { ...state, auth: { ...state.auth, password: action.payload } };
    case A.AUTH_SET_RECOVERY_Q: return { ...state, auth: { ...state.auth, recoveryQ: action.payload } };
    case A.AUTH_SET_RECOVERY_A: return { ...state, auth: { ...state.auth, recoveryA: action.payload } };
    case A.AUTH_SUBMIT_START: return { ...state, auth: { ...state.auth, isSubmitting: true, error: "" } };
    case A.AUTH_SUBMIT_ERROR: return { ...state, auth: { ...state.auth, isSubmitting: false, error: action.payload.message, password: action.payload.clearPassword ? "" : state.auth.password }, cocorisu: { ...state.cocorisu, expression: "concerned" } };
    case A.AUTH_SUBMIT_SUCCESS: return { ...state, auth: { ...state.auth, isSubmitting: false, error: "", step: "success", password: "", currentUser: action.payload.user }, cocorisu: { ...state.cocorisu, expression: "celebrate" } };
    case A.AUTH_LINE_LOGIN_SUCCESS: return { ...state, auth: { ...state.auth, isSubmitting: false, isLoggedIn: true, currentUser: action.payload, error: "" }, ui: { ...state.ui, currentNav: "home" }, cocorisu: { ...state.cocorisu, expression: "happy" } };
    case A.AUTH_FINALIZE: return { ...state, auth: { ...state.auth, isLoggedIn: true }, ui: { ...state.ui, currentNav: "home" }, cocorisu: { ...state.cocorisu, expression: "idle" } };
    case A.AUTH_LOGOUT: return { ...state, auth: { ...state.auth, isLoggedIn: false, step: "welcome", currentUser: null, lastAction: null, loginId: "", password: "" }, cocorisu: { ...state.cocorisu, expression: "idle" } };
    case A.SESSION_CHECK_DONE: return { ...state, auth: { ...state.auth, isCheckingSession: false, isLoggedIn: !!action.payload, currentUser: action.payload || null } };
    case A.SET_TIMELINE:
      return { ...state, posts: { ...state.posts, items: action.payload } };
    case A.AWARD_XP: {
      const amt = action.payload == null ? 20 : action.payload;
      const nx = state.gamification.xp + amt, lu = nx >= 100;
      return { ...state, gamification: { level: lu ? state.gamification.level + 1 : state.gamification.level, xp: lu ? nx - 100 : nx, showXpAlert: true } };
    }
    case A.HIDE_XP_ALERT: return { ...state, gamification: { ...state.gamification, showXpAlert: false } };
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
      const { postId, text } = action.payload;
      const t = LANG[state.ui.lang];
      const nc = { id: "c" + Date.now(), name: t.myName, avatar: t.myAvatar, color: "#5B9BD5", text, time: t.justNow, replies: [] };
      return { ...state, posts: { ...state.posts, items: state.posts.items.map(p => p.id === postId ? { ...p, commentList: [...(p.commentList || []), nc] } : p) } };
    }
    case A.ADD_REPLY: {
      const { postId, commentId, text } = action.payload;
      const t = LANG[state.ui.lang];
      const nr = { id: "r" + Date.now(), name: t.myName, avatar: t.myAvatar, color: "#5B9BD5", text, time: t.justNow };
      return { ...state, posts: { ...state.posts, items: state.posts.items.map(p => p.id !== postId ? p : { ...p, commentList: (p.commentList || []).map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), nr] } : c) }) } };
    }
    case A.SUBMIT_POST_SUCCESS: return { ...state,
      posts: { ...state.posts, items: [action.payload, ...state.posts.items] },
      postForm: { ...state.postForm, modalOpen: false, mode: "normal", quoteTarget: null, giftName: "", category: LANG[state.ui.lang].categories[1], reviewReason: "", reviewReaction: "", reviewNote: "", reviewHeart: "", photoUrl: null, checkResult: { status: "pending", feedback: "" } },
      ui: { ...state.ui, currentNav: "home" },
      cocorisu: { ...state.cocorisu, expression: "celebrate" } };
    case A.LOCATE_REQUEST: return { ...state, location: { ...state.location, isLocating: true }, cocorisu: { ...state.cocorisu, expression: "thinking" } };
    case A.LOCATE_SUCCESS: return { ...state, location: { userLocation: action.payload, isLocating: false, note: LANG[state.ui.lang].locationSetNote }, cocorisu: { ...state.cocorisu, expression: "happy" } };
    case A.CLEAR_LOCATION_NOTE: return { ...state, location: { ...state.location, note: "" } };
    case A.SET_CHAT_INPUT: return { ...state, chat: { ...state.chat, input: action.payload } };
    case A.SEND_CHAT_START: {
      const { sessionId, text } = action.payload;
      return { ...state,
        chat: { ...state.chat, input: "", isSending: true, isWebSearching: false, showHistory: false,
          sessions: state.chat.sessions.map(s => s.id !== sessionId ? s : { ...s,
            title: s.log.some(m => m.sender === "user") ? s.title : (text.length > 16 ? text.slice(0, 16) + "…" : text),
            log: [...s.log, { sender: "user", text }] }) },
        cocorisu: { expression: "thinking", isTalking: true } };
    }
    case A.SET_WEB_SEARCHING: return { ...state, chat: { ...state.chat, isWebSearching: true } };
    case A.SEND_CHAT_SUCCESS: {
      const { sessionId, text, expression, context } = action.payload;
      return { ...state,
        chat: { ...state.chat, isSending: false, isWebSearching: false,
          sessions: state.chat.sessions.map(s => s.id !== sessionId ? s : { ...s, log: [...s.log, { sender: "hato", text, expression }], context: context || s.context }) },
        cocorisu: { expression: expression || "happy", isTalking: false } };
    }
    case A.SEND_CHAT_ERROR: {
      const { sessionId, text } = action.payload;
      return { ...state,
        chat: { ...state.chat, isSending: false, isWebSearching: false,
          sessions: state.chat.sessions.map(s => s.id !== sessionId ? s : { ...s, log: [...s.log, { sender: "hato", text, expression: "sad" }] }) },
        cocorisu: { expression: "sad", isTalking: false } };
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
      return { ...state, postForm: { ...next, checkResult: cocorisuCheck(combined, state.ui.lang) } };
    }
    case A.SELECT_PHOTO: return { ...state, postForm: { ...state.postForm, photoUrl: action.payload } };
    case A.OPEN_POST_MODAL: return { ...state, postForm: { ...state.postForm, modalOpen: true, mode: "normal", quoteTarget: null } };
    case A.OPEN_QUOTE_MODAL: return { ...state, postForm: { ...state.postForm, modalOpen: true, mode: action.payload.kind, quoteTarget: action.payload.quoted, giftName: action.payload.kind === "thanks" ? action.payload.quoted.giftName : state.postForm.giftName } };
    case A.CLOSE_POST_MODAL: return { ...state, postForm: { ...state.postForm, modalOpen: false, mode: "normal", quoteTarget: null } };
    default: return state;
  }
}


// ══════════════════════════════════════════════════════════════════
// 🔐 authService（Firebase Authentication 匿名ログイン版）
// ── 設計方針 ────────────────────────────────────────────────────
//   1. signInAnonymously: 個人情報不要で一瞬でアカウント生成
//   2. onAuthStateChanged: ページリロード後も自動で認証状態を復元
//   3. uid をユーザー識別子として Firestore のドキュメントに紐付ける
//   4. ログアウト後に再ログインすると別のuidが発行される（匿名の性質）
// ══════════════════════════════════════════════════════════════════
const authService = {
  async signInAnon() {
    try {
      const cred = await signInAnonymously(fbAuth);
      return { ok: true, user: { uid: cred.user.uid, loginId: "guest_" + cred.user.uid.slice(0, 8) } };
    } catch (e) {
      console.error("Firebase signInAnonymously error:", e);
      return { ok: false, code: "AUTH_ERROR" };
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
      const ref = await addDoc(collection(fbDb, "posts"), {
        ...postData,
        likes: 0,
        liked: false,
        comments: 0,
        createdAt: serverTimestamp(),
      });
      return { ok: true, id: ref.id };
    } catch (e) {
      console.error("Firestore addDoc error:", e);
      return { ok: false };
    }
  },
  subscribeTimeline(callback) {
    // 最新100件を更新日時降順でリアルタイム購読
    const q = query(collection(fbDb, "posts"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toLocaleDateString("ja-JP") : "たった今",
      }));
      callback(items);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
    });
  },
  async toggleLike(postId, currentlyLiked) {
    try {
      await updateDoc(doc(fbDb, "posts", postId), {
        likes: increment(currentlyLiked ? -1 : 1),
      });
      return { ok: true };
    } catch (e) {
      console.error("Firestore updateDoc error:", e);
      return { ok: false };
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
//            .hasOnly(['likes']);                     // いいね数の更新のみ許可
//     }
//   }
// }
// ══════════════════════════════════════════════════════════════════

export default function AgeteApp() {
  const [state, dispatch] = useReducer(reducer, null, loadPersistedState);
  const isDesktop = useIsDesktop();

  const { lang, currentNav } = state.ui;
  const { isLoggedIn, isCheckingSession, isSubmitting, step: authStep, lastAction, loginId, password, recoveryQ, recoveryA, error: authError } = state.auth;
  const { level: userLv, xp: userXp, showXpAlert } = state.gamification;
  const { items: posts, selectedCategory, searchQuery: postSearchQuery, feedMode } = state.posts;
  const { following } = state.social;
  const { userLocation, isLocating, note: locationNote } = state.location;
  const { expression: hatomono, isTalking: isHatoTalking } = state.cocorisu;
  const { input: chatInput, sessions: chatSessions, activeId: chatActiveId, isSending, isWebSearching, showHistory: chatShowHistory } = state.chat;
  const activeChat = chatSessions.find(s => s.id === chatActiveId) || chatSessions[0];
  const chatLog = activeChat.log;
  const { searchQuery: dbSearchQuery } = state.db;
  const { modalOpen, mode: formMode, quoteTarget, giftName: newGiftName, category: newPostCategory, reviewReason, reviewReaction, reviewNote, reviewHeart, scene: selectedScene, recipient: selectedRecipient, price: selectedPrice, photoUrl: newPhotoUrl, checkResult } = state.postForm;

  const t = LANG[lang];
  const demoOrigin = { lat: 43.7628, lng: 142.3584 };

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
    const unsub = authService.subscribeAuthState((fbUser) => {
      dispatch({
        type: A.SESSION_CHECK_DONE,
        payload: fbUser ? { uid: fbUser.uid, loginId: "guest_" + fbUser.uid.slice(0, 8) } : null,
      });
    });
    return () => unsub();
  }, []);

  // ── Firestoreタイムラインのリアルタイム購読 ──────────────────────
  useEffect(() => {
    const unsub = postService.subscribeTimeline((items) => {
      dispatch({ type: A.SET_TIMELINE, payload: items });
    });
    return () => unsub();
  }, []);

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
  const handleAuthSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (stateRef.current.auth.isSubmitting) return;
    dispatch({ type: A.AUTH_SUBMIT_START });
    try {
      const result = await authService.signInAnon();
      if (result.ok) dispatch({ type: A.AUTH_SUBMIT_SUCCESS, payload: { user: result.user } });
      else dispatch({ type: A.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: false } });
    } catch (_) {
      dispatch({ type: A.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: false } });
    }
  };

  const handleLineLogin = handleAuthSubmit;  // LINEログイン→匿名認証で代用（将来LINEに切り替え可）

  const handleFinalizeLogin = () => {
    const user = stateRef.current.auth.currentUser;
    if (user) { try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)); } catch (_) { /* noop */ } }
    dispatch({ type: A.AUTH_FINALIZE });
  };

  // ── 「ようこそ」画面は見せつつ、ボタンを押さなくても自動でホームへ進む ──
  // （「この内容で始める」を押した後に何も起きないように見える、というつまずきをなくすための保険）
  useEffect(() => {
    if (authStep !== "success") return;
    const timer = setTimeout(() => { handleFinalizeLogin(); }, 1400);
    return () => clearTimeout(timer);
  }, [authStep]);

  const handleLogout = async () => {
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
      const brain = cocorisuBrainLogic(userMsg, capturedContext, capturedLang, cur.posts.items);
      if (brain.mode === "reply") {
        dispatch({ type: A.SEND_CHAT_SUCCESS, payload: { sessionId, text: brain.text, expression: brain.expression, context: brain.context } });
        return;
      }
      dispatch({ type: A.SET_WEB_SEARCHING });
      let web = null;
      try { web = await searchWikipedia(brain.topic, capturedLang); } catch (_) { web = null; }
      if (web) {
        const dbNote = brain.itemHit ? (ja ? "\n\n🎁 ちなみに商品としての基本情報はこれだけ分かるりす：" + describeItem(brain.itemHit, "ja").split("\n")[1] : "\n\n🎁 As a product, here's what I know: " + describeItem(brain.itemHit, "en").split("\n")[1]) : "";
        const text = ja
          ? "🌐 「" + brain.topic + "」について調べてきたりす！\n\n📖 " + web.title + "\n" + web.extract + "…\n\n[Wikipediaで続きを読むりす](" + web.url + ")" + dbNote
          : "🌐 I looked up \"" + brain.topic + "\"-risu!\n\n📖 " + web.title + "\n" + web.extract + "…\n\n[Read more on Wikipedia-risu](" + web.url + ")";
        dispatch({ type: A.SEND_CHAT_SUCCESS, payload: { sessionId, text, expression: "surprised", context: brain.context } });
      } else {
        let text = ja
          ? "「" + brain.topic + "」について、ネットでうまく調べきれなかったりす…正直に言うね🙏"
          : "I couldn't find reliable info on \"" + brain.topic + "\" online right now-risu… being honest here🙏";
        if (brain.itemHit) {
          text += ja
            ? "\n\nただ、商品としての基本情報ならDBにあるりす：" + describeItem(brain.itemHit, "ja").split("\n")[1] + "\n（これは商品情報で、調べてほしかった内容そのものじゃないかもしれないりす）"
            : "\n\nThough as a product, I do know this: " + describeItem(brain.itemHit, "en").split("\n")[1] + "\n(This is product info, not necessarily what you asked about.)";
        } else {
          text += ja
            ? "\n地域名（旭川・札幌・釧路など）のおすすめや、「蔵生って何？」みたいな質問なら得意りす！"
            : "\nTry region picks or questions like \"what is Kuranama?\"-risu!";
        }
        dispatch({ type: A.SEND_CHAT_SUCCESS, payload: { sessionId, text, expression: "sad", context: brain.context } });
      }
    } catch {
      dispatch({ type: A.SEND_CHAT_ERROR, payload: { sessionId, text: ja ? "あれ、うまく答えられなかったりす…もう一度聞いてみてほしいりす🙏" : "Oops, something went wrong-risu… please try again🙏" } });
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
      userName: t.myName + "_" + uid.slice(0, 6),
      userAvatar: t.myAvatar, avatarColor: "#5B9BD5",
      giftEmoji: formMode === "thanks" ? "💝" : "🎁",
      giftBg: "linear-gradient(135deg,#eef2f5,#dbe4ec)",
      giftName: newGiftName,
      recipient: selectedRecipient || t.recipients[0],
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
      postKind: formMode, quoted: quoteTarget, commentList: [], mine: true,
      lat: 43.7628, lng: 142.3584, locationName: "北海道",
    };
    // 楽観的UI更新（Firestoreの応答を待たずに即表示）
    dispatch({ type: A.SUBMIT_POST_SUCCESS, payload: { ...newPostData, id: "optimistic_" + Date.now(), likes: 0, liked: false, comments: 0, createdAt: t.justNow } });
    dispatch({ type: A.AWARD_XP, payload: 20 });
    setTimeout(() => dispatch({ type: A.HIDE_XP_ALERT }), 4000);
    // Firestoreに保存（onSnapshotが成功後に本物データで上書き）
    await postService.addPost(newPostData);
  };

  const postFormCoreProps = {
    t, mode: formMode, quoteTarget,
    giftName: newGiftName, onChangeGiftName: v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "giftName", value: v } }),
    category: newPostCategory, categories: t.categories.slice(1),
    onChangeCategory: v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "category", value: v } }),
    reviewReason, reviewReaction, reviewNote, reviewHeart,
    onChangeReviewPart: (field, value) => dispatch({ type: A.SET_REVIEW_PART, payload: { field, value } }),
    combinedReview, photoUrl: newPhotoUrl,
    onPickPhotoFile: handlePickPhotoFile, onSamplePhoto: handleSamplePhoto,
    checkResult, hatomono, onSubmit: handlePostSubmit, canSubmit,
  };

  const panels = {
    home: <HomePanel t={t} isDesktop={isDesktop} posts={posts} feedMode={feedMode} following={following} selectedCategory={selectedCategory} postSearchQuery={postSearchQuery} userLocation={userLocation} isLocating={isLocating} locationNote={locationNote} demoOrigin={demoOrigin} calcDist={calcDist} dispatch={dispatch} A={A} onOpenQuote={handleOpenQuote} />,
    search: <SearchPanel t={t} isDesktop={isDesktop} hatomono={hatomono} isHatoTalking={isHatoTalking} chatLog={chatLog} chatInput={chatInput} isSending={isSending} isWebSearching={isWebSearching} sessions={chatSessions} activeId={chatActiveId} showHistory={chatShowHistory} dbSearchQuery={dbSearchQuery} onSendChat={handleSendChat} onChatKeyDown={handleChatKeyDown} dispatch={dispatch} A={A} />,
    gift: <GiftPanel t={t} isDesktop={isDesktop} dbSearchQuery={dbSearchQuery} dispatch={dispatch} A={A} />,
    post: (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <PostForm {...postFormCoreProps}
            scene={selectedScene} scenes={t.scenes} onChangeScene={v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "scene", value: v } })}
            recipient={selectedRecipient} recipients={t.recipients} onChangeRecipient={v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "recipient", value: v } })}
            price={selectedPrice} prices={t.prices} onChangePrice={v => dispatch({ type: A.SET_POST_FIELD, payload: { field: "price", value: v } })} />
        </div>
      </div>
    ),
    me: <MePanel t={t} userLv={userLv} userXp={userXp} loginId={loginId} followingCount={following.length} onLogout={handleLogout} />,
  };

  if (isCheckingSession) {
    return (
      <div style={{ fontFamily: t.font, background: "#F5F7FA", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <Cocorisu size={90} expression="thinking" isTalking />
        <p style={{ fontSize: "13px", color: "#718096" }}>{t.chatThinking}</p>
        <style>{"@keyframes sw{0%,100%{height:4px;}50%{height:14px;}}@keyframes hatoBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-3px);}}"}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.font, background: "#F5F7FA", minHeight: "100vh", color: "#2D2926" }}>
      <Header t={t} onToggleLang={() => dispatch({ type: A.SET_LANG, payload: lang === "ja" ? "en" : "ja" })} isLoggedIn={isLoggedIn} userLv={userLv} userXp={userXp} />

      {showXpAlert && (
        <div style={{ position: "fixed", top: "70px", right: "20px", background: "#4A7C6F", color: "#fff", padding: "12px 24px", borderRadius: "10px", boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 100, display: "flex", alignItems: "center", gap: "10px", animation: "fadeInUp 0.35s ease" }}>
          <span>🎉</span> <b>{t.xpGained}</b>
        </div>
      )}

      {!isLoggedIn ? (
        <AuthGate t={t} hatomono={hatomono} authStep={authStep} loginId={loginId} password={password}
          recoveryQ={recoveryQ} recoveryA={recoveryA} authError={authError} isSubmitting={isSubmitting} lastAction={lastAction}
          onChangeLoginId={v => dispatch({ type: A.AUTH_SET_LOGIN_ID, payload: v })}
          onChangePassword={v => dispatch({ type: A.AUTH_SET_PASSWORD, payload: v })}
          onChangeRecoveryQ={v => dispatch({ type: A.AUTH_SET_RECOVERY_Q, payload: v })}
          onChangeRecoveryA={v => dispatch({ type: A.AUTH_SET_RECOVERY_A, payload: v })}
          onLineLogin={handleLineLogin}
          onGotoSignup={handleAuthSubmit}
          onGotoLogin={() => dispatch({ type: A.AUTH_GOTO_STEP, payload: "login_id" })}
          onSubmit={handleAuthSubmit} onFinalizeLogin={handleFinalizeLogin} />
      ) : isDesktop ? (
        <div style={{ display: "flex", maxWidth: "1240px", margin: "0 auto" }}>
          <nav style={{ width: "200px", flexShrink: 0, padding: "20px 12px", position: "sticky", top: "61px", height: "calc(100vh - 61px)", boxSizing: "border-box" }}>
            {NAV_META.map(({ nav, emoji }) => (
              <button key={nav} onClick={() => dispatch({ type: A.SET_NAV, payload: nav })}
                style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 16px", marginBottom: "4px", background: currentNav === nav ? "#E3EEF9" : "none", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "bold", color: currentNav === nav ? "#3D7CB8" : "#4A5568", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}>
                <span style={{ fontSize: "20px" }}>{emoji}</span>{t["nav" + nav.charAt(0).toUpperCase() + nav.slice(1)]}
              </button>
            ))}
          </nav>
          <main style={{ flex: 1, minWidth: 0, paddingBottom: "40px" }}>{panels[currentNav]}</main>
        </div>
      ) : (
        <div style={{ paddingBottom: "64px" }}>
          <p style={{ fontSize: "10px", color: "#A0AEC0", textAlign: "center", margin: "8px 0 0 0" }}>{t.swipeHint}</p>
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
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-around", padding: "6px 0 10px 0", zIndex: 30 }}>
          {NAV_META.map(({ nav, emoji }) => (
            <button key={nav} onClick={() => dispatch({ type: A.SET_NAV, payload: nav })}
              style={{ background: "none", border: "none", flexDirection: "column", alignItems: "center", display: "flex", fontSize: "10px", color: currentNav === nav ? "#5B9BD5" : "#A0AEC0", cursor: "pointer", fontWeight: "bold", padding: "4px 14px", borderTop: currentNav === nav ? "2.5px solid #5B9BD5" : "2.5px solid transparent", transition: "color 0.2s, border 0.2s" }}>
              <span style={{ fontSize: "19px" }}>{emoji}</span>{t["nav" + nav.charAt(0).toUpperCase() + nav.slice(1)]}
            </button>
          ))}
        </nav>
      )}

      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }} onClick={e => { if (e.target === e.currentTarget) dispatch({ type: A.CLOSE_POST_MODAL }); }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", maxWidth: "500px", width: "100%", maxHeight: "88vh", overflowY: "auto", position: "relative", animation: "fadeInUp 0.3s ease" }}>
            <button onClick={() => dispatch({ type: A.CLOSE_POST_MODAL })} style={{ position: "absolute", top: "12px", right: "16px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#A0AEC0", lineHeight: 1 }}>✕</button>
            <PostForm {...postFormCoreProps} />
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700&display=swap');
        .agete-snap::-webkit-scrollbar { display: none; }
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
