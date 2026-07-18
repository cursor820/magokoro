import { useReducer, useEffect, useRef, useState, useCallback } from "react";

// ── Firebase SDK（環境変数で設定・GitHubには鍵を残さない） ──────────────
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, getDoc, setDoc, increment, serverTimestamp, query, orderBy, limit } from "firebase/firestore";

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
    otoriyosePostPrefix: "📦 「", otoriyosePostSuffix: "」を、遠くにいる大切な人にも贈れるりす🎁",
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
    authLineBtn: "LINEログイン（準備中）",
    authIdpassBtn: "アカウントを作成",
    authAnonBtn: "お試しでのぞいてみる",
    authGuideMsg: "アカウント作成も、名前・メール・電話番号は一切いらないりす🐿️ お好きなIDとパスワードを決めるだけ！\nとりあえず覗いてみたいだけなら「お試し」でOKりす、めんどうな設定は何もいらないりす✨\nLINEログインも近々使えるようになる予定りす🙏",
    authSwitchToLogin: "すでにアカウントをお持ちの方は", authSwitchToSignup: "はじめての方は",
    authLoginLink: "ログイン", authSignupLink: "新規登録",
    authPassword: "パスワード", authLoginId: "ログインID", authLoginIdHint: "半角英数字3〜20文字",
    authSubmitSignupId: "この内容で始める", authSubmitLoginId: "ログインする",
    authRecoveryTitle: "パスワードを忘れたときのための質問（任意）",
    authRecoveryHint: "設定しなくても登録できます。心配な方だけ、本人確認用に決めておけます",
    authRecoverySelectPh: "質問を選ぶ", authRecoveryAnswer: "答え",
    authErrRequired: "入力してください", authErrLoginIdShort: "ログインIDは3文字以上で入力してください",
    authErrPasswordShort: "パスワードは6文字以上で入力してください",
    authErrInvalidCredentials: "ログインIDまたはパスワードが正しくないりす…",
    authErrDuplicateId: "そのログインIDはすでに使われているりす…別のIDを試してほしいりす",
    authErrNetwork: "サーバーに接続できなかったりす…時間をおいてもう一度試してほしいりす",
    authErrRequired: "ログインIDとパスワードを入力してほしいりす",
    authErrDuplicateId: "そのログインIDはもう使われてるりす。別のIDを試してほしいりす",
    authErrInvalidCredentials: "ログインIDかパスワードが正しくないりす",
    myEditName: "名前を変更", mySave: "保存", mySaving: "保存中…", myCancel: "キャンセル",
    myNameSaved: "変更したりす✓", myNameSaveError: "保存できなかったりす、もう一度試してほしいりす",
    myGuestNameNote: "ゲストの名前は固定りす。名前を変えたい時はIDとパスワードで登録してほしいりす",
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
    appSub: "Gift Review Community", postBtn: "+ Post Review", switchLabel: "한국어",
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
    otoriyosePostPrefix: "📦 「", otoriyosePostSuffix: "」— send this to someone far away🎁",
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
    authLineBtn: "LINE Login (coming soon)",
    authIdpassBtn: "Create an account",
    authAnonBtn: "Just take a look (try it)",
    authGuideMsg: "Creating an account needs no name, email, or phone number-risu🐿️ Just pick any ID and password!\nJust want to peek around? \"Try it\" needs zero setup-risu✨\nLINE login is coming soon too-risu🙏",
    authSwitchToLogin: "Already have an account?", authSwitchToSignup: "New here?",
    authLoginLink: "Log in", authSignupLink: "Sign up",
    