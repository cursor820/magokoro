import { useReducer, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════
// 🐦 アゲハト コンポーネント（デレ表情「tokimeki」対応版）
// ------------------------------------------------------------------
// expression="tokimeki" のとき、羽・体・頭がピンク系パレットに切り替わり、
// ほっぺの赤みが濃くなる。「愛してる」「ありがとう」などの雑談で発火する。
// ══════════════════════════════════════════════════
const WING = { idle:{a:10}, happy:{a:30}, thinking:{a:-5}, celebrate:{a:45}, concerned:{a:0}, tokimeki:{a:38} };

const Agehato = ({ size=90, expression="idle", isTalking=false }) => {
  const w = WING[expression] || WING.idle;
  const isDere = expression === "tokimeki";
  // 通常はブルー系、デレ時はピンク系パレットへ全身が変化する
  const B  = isDere ? "#F48FB1" : "#5B9BD5";
  const Bd = isDere ? "#E0619B" : "#3D7CB8";
  const Bl = isDere ? "#FCD9E6" : "#A8D0F0";
  const cheekColor = isDere ? "#F26B9E" : "#F5A0A0";
  const cheekOpacity = isDere ? 0.95 : 0.6;
  return (
    <div style={{position:"relative",width:size,height:size*1.1,flexShrink:0}}>
      <div style={{position:"absolute",top:size*.35,left:size*.02,width:size*.32,height:size*.4,background:`linear-gradient(135deg,${Bd},${B})`,borderRadius:"60% 40% 50% 50%",transform:`rotate(${-w.a}deg)`,transformOrigin:"top right",transition:"transform 0.4s, background 0.4s"}} />
      <div style={{position:"absolute",top:size*.35,right:size*.02,width:size*.32,height:size*.4,background:`linear-gradient(225deg,${Bd},${B})`,borderRadius:"40% 60% 50% 50%",transform:`rotate(${w.a}deg)`,transformOrigin:"top left",transition:"transform 0.4s, background 0.4s"}} />
      <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:size*.7,height:size*.65,borderRadius:"50% 50% 45% 45%",background:`linear-gradient(180deg,${Bl},#fff)`,border:`2.5px solid ${B}`,transition:"background 0.4s, border 0.4s"}} />
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:size*.62,height:size*.58,borderRadius:"50%",background:`radial-gradient(circle at 35% 30%,${Bl},${B})`,border:`2.5px solid ${Bd}`,boxShadow:isTalking?`0 0 0 ${size*.03}px ${B}44`:"none",transition:"box-shadow 0.3s, background 0.4s, border 0.4s"}}>
        <div style={{position:"absolute",bottom:"30%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:`${size*.05}px solid transparent`,borderRight:`${size*.05}px solid transparent`,borderTop:`${size*.07}px solid #FFAB76`}} />
        <div style={{position:"absolute",top:"30%",left:"22%",width:size*.13,height:size*.13,background:"#fff",borderRadius:"50%",border:"1.5px solid #2D2926"}}>
          <div style={{position:"absolute",top:"25%",left:"25%",width:"50%",height:"50%",background:"#2D2926",borderRadius:"50%",transform:(expression==="happy"||expression==="tokimeki")?"scaleY(0.3)":"scaleY(1)",transition:"transform 0.2s"}} />
        </div>
        <div style={{position:"absolute",top:"30%",right:"22%",width:size*.13,height:size*.13,background:"#fff",borderRadius:"50%",border:"1.5px solid #2D2926"}}>
          <div style={{position:"absolute",top:"25%",left:"25%",width:"50%",height:"50%",background:"#2D2926",borderRadius:"50%",transform:(expression==="happy"||expression==="tokimeki")?"scaleY(0.3)":"scaleY(1)",transition:"transform 0.2s"}} />
        </div>
        <div style={{position:"absolute",top:"48%",left:"4%",width:size*.1,height:size*.06,background:cheekColor,borderRadius:"50%",opacity:cheekOpacity,transition:"opacity 0.3s, background 0.3s"}} />
        <div style={{position:"absolute",top:"48%",right:"4%",width:size*.1,height:size*.06,background:cheekColor,borderRadius:"50%",opacity:cheekOpacity,transition:"opacity 0.3s, background 0.3s"}} />
        {isDere && <div style={{position:"absolute",top:"-14px",right:"-6px",fontSize:size*.2,animation:"floatHeart 1.2s ease-in-out infinite"}}>🩷</div>}
      </div>
      <div style={{position:"absolute",top:size*.5,left:"50%",transform:"translateX(-50%)",width:size*.5,height:size*.12,background:"#E8A87C",borderRadius:"0 0 40% 40%",border:`2px solid ${Bd}`}} />
      {isTalking&&<div style={{position:"absolute",bottom:"-14px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"3px",alignItems:"flex-end"}}>{[0,1,2,3,4].map(i=><div key={i} style={{width:"3px",background:B,borderRadius:"2px",animation:"sw 0.5s ease-in-out infinite",animationDelay:`${i*.1}s`}}/>)}</div>}
    </div>
  );
};

// ══════════════════════════════════════════════════
// 🌐 言語定義
// ══════════════════════════════════════════════════
const LANG = {
  ja: {
    appSub:"お土産・ギフトレビュー", postBtn:"+ 投稿する", switchLabel:"EN",
    heroTitle:'"あの贈り物、よかったよ"', heroSub:"が集まる場所",
    heroDesc:"贈った体験をシェアして、次に贈る誰かの参考に。",
    reviewsLabel:"件のレビュー", likesLabel:"のいいね", toLabel:"贈り先：",
    shareBtn:"↗ シェア", pricePrivate:"非公開", justNow:"たった今", myName:"あなた", myAvatar:"あ",
    font:"'Noto Sans JP', sans-serif",
    navHome:"ホーム", navSearch:"さがす", navPost:"投稿", navMe:"マイページ",
    chatPlaceholder:"アゲハトに聞いてみる...",
    chatWelcome:"こんにちは！アゲハトだっぽ！\n世界中のお土産・お菓子・ギフト、自分へのご褒美まで何でも聞いてっぽ〜🐦",
    quickExamples:["旭川のおすすめお土産は？","釧路のお土産は？","蔵生って健康的？","ダイエット中なんだけど…"],
    chatThinking:"考え中っぽ…",
    swipeHint:"← 画面を左右にスワイプしてもタブを移動できるっぽ →",
    reviewCheckBtn:"アゲハトにチェックしてもらう",
    reviewOk:"いいレビューだっぽ！このまま投稿できるっぽ✨",
    reviewWaiting:"レビューを書いたら、アゲハトがチェックするっぽ！",
    reviewChecking:"チェック中…",
    reviewError:"あれ、うまくチェックできなかったっぽ…もう一度試してほしいっぽ",
    modalTitle:"🎁 贈り物レビューを投稿",
    emojiLabel:"絵文字", giftNameLabel:"贈り物の名前", giftNamePh:"例：北海道スイーツセット",
    recipientLabel:"贈り先", sceneLabel:"シーン", categoryLabel:"カテゴリ", priceLabel:"価格帯",
    ratingLabel:"評価", reviewLabel:"レビュー",
    reviewReasonLabel:"💡 選んだ理由・背景",
    reviewReasonPh:"例：母が甘いものが大好きなので、地元の名品を選びました",
    reactionPartnerLabel:"💬 相手の反応", reactionSelfLabel:"🥰 自分の気持ち", reactionSwitch:"切替",
    reviewReactionPhPartner:"例：食べた瞬間に「これ美味しい！」と電話がきました",
    reviewReactionPhSelf:"例：喜んでもらえて、選んでよかったと心から思いました",
    reviewOtherLabel:"✨ おすすめポイント・その他",
    reviewOtherPh:"例：個包装で配りやすいのも嬉しいポイントです",
    previewLabel:"📝 投稿プレビュー（この文章がタイムラインに載ります）",
    previewEmpty:"上の欄に入力すると、ここに自然な一つの文章として結合されるっぽ！",
    submitBtn:"投稿する 🎁", selectPh:"選択", posted:"投稿しました！",
    emptyTitle:"投稿はまだありません。", emptyDesc:"最初のレビューを投稿しましょう！",
    postSearchPlaceholder:"投稿を検索（贈り物名・レビュー内容）",
    noMatchTitle:"一致する投稿が見つかりませんでした。", noMatchDesc:"キーワードやカテゴリを変えてみてください。",
    dbSearchPlaceholder:"お土産名・地域・タグで検索",
    dbSearchNoMatch:"一致するお土産が見つからなかったっぽ…",
    categories:["すべて","グルメ","インテリア","体験・チケット","フラワー","ファッション・アクセサリー","美容","雑貨・伝統工芸"],
    scenes:["誕生日","引越し祝い","結婚記念日","退職祝い","出産祝い","バレンタイン","ホワイトデー","母の日","父の日","その他"],
    recipients:["母","父","友人（女性）","友人（男性）","恋人","配偶者","兄弟・姉妹","上司","同僚","祖父母","両親","子ども","自分","その他"],
    prices:["〜¥1,000","¥1,000〜3,000","¥3,000〜5,000","¥5,000〜10,000","¥10,000〜"],
    nearbyBtn:"📍 近くのお土産から探す", nearbyTitle:"現在地から近い順",
    nearbyEmpty:"近くに投稿が見つからなかったっぽ…", distanceUnit:"m先",
    nearbyFallbackNote:"現在地を取得できなかったので、旭川駅の周辺で表示してるっぽ！",
    locateBtn:"📍 現在地を使う", locating:"取得中…", locationSetNote:"現在地を設定したっぽ！",
    authTagline:"喜びを広げる agete", authSubtitle:"小さなお土産に、大きな物語を。",
    authAgehatoHello:"一緒に旅の思い出、集めよっぽ！", authAgehatoWelcomeBack:"おかえりなさいっぽ！",
    authLineBtn:"LINEで3秒登録・ログイン", authLineBtnSub:"面倒な入力なし、いちばん簡単",
    authEmailBtn:"メールアドレスで登録",
    authIdpassBtn:"個人情報の入力なしで始める", authIdpassBtnSub:"ログインID・パスワードのみ",
    authSwitchToLogin:"すでにアカウントをお持ちの方は", authSwitchToSignup:"はじめての方は",
    authLoginLink:"ログイン", authSignupLink:"新規登録", authBack:"もどる",
    authEmail:"メールアドレス", authPassword:"パスワード", authPasswordConfirm:"パスワード（確認）",
    authLoginId:"ログインID", authLoginIdHint:"半角英数字3〜20文字",
    authSubmitSignupEmail:"メールアドレスで登録する", authSubmitLoginEmail:"ログインする",
    authSubmitSignupId:"この内容で始める", authSubmitLoginId:"ログインする",
    authRecoveryTitle:"パスワードを忘れたときのための質問",
    authRecoveryHint:"メールアドレスを登録しない代わりに、本人確認用の質問を設定します",
    authRecoverySelectPh:"質問を選ぶ", authRecoveryCustomOption:"💡 自分で質問を自由に決める",
    authRecoveryCustomPh:"例：初めて行った旅行先は？", authRecoveryAnswer:"答え",
    authRecoveryAnswerHint:"ひらがな・カタカナ・大文字小文字は区別されません",
    authForgotPassword:"パスワードをお忘れですか？",
    authErrRequired:"入力してください", authErrEmail:"メールアドレスの形式が正しくありません",
    authErrPasswordShort:"パスワードは8文字以上で入力してください",
    authErrPasswordMatch:"パスワードが一致しません", authErrLoginIdShort:"ログインIDは3文字以上で入力してください",
    authErrInvalidCredentials:"ログインIDまたはパスワードが正しくないっぽ…",
    authErrDuplicateId:"そのログインIDはすでに使われているっぽ…別のIDを試してほしいっぽ",
    authErrNetwork:"サーバーに接続できなかったっぽ…時間をおいてもう一度試してほしいっぽ",
    authErrRateLimited:"試行回数が多すぎるっぽ…少し時間をおいてから試してほしいっぽ",
    authSubmitting:"送信中…",
    authWelcomeBackBody:"続きから、お土産の物語を集めていこう。",
    authSuccessTitle:"ようこそ、アゲテへ！",
    authSuccessBody:"Lv.1からスタートだっぽ！さっそくお土産の物語を集めにいこう。",
    authSuccessCta:"はじめる", authLogout:"ログアウト",
    recoveryPresets:["最初に飼ったペットの名前は？","生まれた町の名前は？","好きな映画のタイトルは？","子供の頃のあだ名は？","一番好きだった先生の名前は？"],
    levelLabel:"Lv.", xpLabel:"XP", xpGained:"+20 XP 獲得したっぽ！",
  },
  en: {
    appSub:"Gift Review Community", postBtn:"+ Post Review", switchLabel:"日本語",
    heroTitle:'"That gift was perfect."', heroSub:"Share your gifting story.",
    heroDesc:"Share your gifting experiences and help others find the perfect present.",
    reviewsLabel:" Reviews", likesLabel:" Likes", toLabel:"To: ",
    shareBtn:"↗ Share", pricePrivate:"Private", justNow:"Just now", myName:"You", myAvatar:"Y",
    font:"'Inter','Helvetica Neue',sans-serif",
    navHome:"Home", navSearch:"Search", navPost:"Post", navMe:"Profile",
    chatPlaceholder:"Ask Agehato anything...",
    chatWelcome:"Hey there! I'm Agehato-ppo!\nSouvenirs, sweets, gifts, treats for yourself — ask me anything worldwide 🐦🌏",
    quickExamples:["Asahikawa souvenir ideas?","Souvenirs in Kushiro?","Is Kuranama healthy?","I'm on a diet..."],
    chatThinking:"Thinking-ppo…",
    swipeHint:"← Swipe left / right to switch tabs-ppo →",
    reviewCheckBtn:"Let Agehato check it",
    reviewOk:"Great review-ppo! Ready to post ✨",
    reviewWaiting:"Write your review and Agehato will check it-ppo!",
    reviewChecking:"Checking…",
    reviewError:"Hmm, the check didn't go through-ppo... please try again",
    modalTitle:"🎁 Post a Gift Review",
    emojiLabel:"Emoji", giftNameLabel:"Gift Name", giftNamePh:"e.g. Hokkaido Sweet Set",
    recipientLabel:"Recipient", sceneLabel:"Occasion", categoryLabel:"Category", priceLabel:"Price Range",
    ratingLabel:"Rating", reviewLabel:"Review",
    reviewReasonLabel:"💡 Why you chose it",
    reviewReasonPh:"e.g. My mom loves sweets, so I picked a local specialty",
    reactionPartnerLabel:"💬 Their reaction", reactionSelfLabel:"🥰 How you felt", reactionSwitch:"Switch",
    reviewReactionPhPartner:"e.g. She called me right away saying it was delicious!",
    reviewReactionPhSelf:"e.g. Seeing them smile made it all worth it",
    reviewOtherLabel:"✨ Highlights & anything else",
    reviewOtherPh:"e.g. Individually wrapped, perfect for sharing",
    previewLabel:"📝 Post preview (this is what appears on the timeline)",
    previewEmpty:"Fill in the fields above and they'll blend into one natural paragraph here-ppo!",
    submitBtn:"Post Review 🎁", selectPh:"Select", posted:"Posted!",
    emptyTitle:"No reviews yet.", emptyDesc:"Be the first to post a review!",
    postSearchPlaceholder:"Search posts (gift name, review text)",
    noMatchTitle:"No matching posts found.", noMatchDesc:"Try a different keyword or category.",
    dbSearchPlaceholder:"Search by name, region, or tag",
    dbSearchNoMatch:"No matching souvenirs found-ppo…",
    categories:["All","Food & Drink","Home & Decor","Experiences","Flowers","Fashion & Accessories","Beauty","Crafts & Traditional Goods"],
    scenes:["Birthday","Housewarming","Anniversary","Farewell","Baby Gift","Valentine's","White Day","Mother's Day","Father's Day","Other"],
    recipients:["Mother","Father","Female Friend","Male Friend","Partner","Spouse","Sibling","Boss","Colleague","Grandparents","Parents","Child","Myself","Other"],
    prices:["Under ¥1,000","¥1,000–3,000","¥3,000–5,000","¥5,000–10,000","¥10,000+"],
    nearbyBtn:"📍 Find souvenirs near me", nearbyTitle:"Nearest first",
    nearbyEmpty:"No nearby posts found-ppo…", distanceUnit:"m away",
    nearbyFallbackNote:"Couldn't get your location, showing results near Asahikawa Station instead-ppo!",
    locateBtn:"📍 Use current location", locating:"Locating…", locationSetNote:"Location set-ppo!",
    authTagline:"Spreading Joy — agete", authSubtitle:"Big stories, small souvenirs.",
    authAgehatoHello:"Let's collect travel memories together!", authAgehatoWelcomeBack:"Welcome back!",
    authLineBtn:"Continue with LINE (3 sec)", authLineBtnSub:"No forms, the fastest way in",
    authEmailBtn:"Sign up with email",
    authIdpassBtn:"Start without personal info", authIdpassBtnSub:"Login ID & password only",
    authSwitchToLogin:"Already have an account?", authSwitchToSignup:"New here?",
    authLoginLink:"Log in", authSignupLink:"Sign up", authBack:"Back",
    authEmail:"Email address", authPassword:"Password", authPasswordConfirm:"Confirm password",
    authLoginId:"Login ID", authLoginIdHint:"3–20 letters, numbers, or underscores",
    authSubmitSignupEmail:"Sign up with email", authSubmitLoginEmail:"Log in",
    authSubmitSignupId:"Start with these details", authSubmitLoginId:"Log in",
    authRecoveryTitle:"A question for password recovery",
    authRecoveryHint:"Since there's no email on file, set a question to verify it's you",
    authRecoverySelectPh:"Choose a question", authRecoveryCustomOption:"💡 Write your own question",
    authRecoveryCustomPh:"e.g. Where was your first trip?", authRecoveryAnswer:"Answer",
    authRecoveryAnswerHint:"Not case-sensitive",
    authForgotPassword:"Forgot your password?",
    authErrRequired:"This field is required", authErrEmail:"Enter a valid email address",
    authErrPasswordShort:"Password must be at least 8 characters",
    authErrPasswordMatch:"Passwords do not match", authErrLoginIdShort:"Login ID must be at least 3 characters",
    authErrInvalidCredentials:"Login ID or password is incorrect-ppo…",
    authErrDuplicateId:"That login ID is already taken-ppo… try a different one",
    authErrNetwork:"Couldn't connect to the server-ppo… please try again shortly",
    authErrRateLimited:"Too many attempts-ppo… please wait a moment and try again",
    authSubmitting:"Submitting…",
    authWelcomeBackBody:"Let's pick up where you left off.",
    authSuccessTitle:"Welcome to Agete!",
    authSuccessBody:"You're starting at Lv.1 — let's go find some souvenir stories.",
    authSuccessCta:"Get started", authLogout:"Log out",
    recoveryPresets:["What was your first pet's name?","What town were you born in?","What's your favorite movie?","What was your childhood nickname?","Who was your favorite teacher?"],
    levelLabel:"Lv.", xpLabel:"XP", xpGained:"+20 XP earned-ppo!",
  },
};

// ══════════════════════════════════════════════════
// 📦 タイムライン用初期データ
// ══════════════════════════════════════════════════
const POSTS_JA = [
  {id:"1",userName:"Haruka_M",userAvatar:"H",avatarColor:"#C17B74",giftEmoji:"🍜",giftBg:"linear-gradient(135deg,#f8e8d4,#ffd9b3)",giftName:"函館塩ラーメンセット",recipient:"母",scene:"誕生日",category:"グルメ",rating:5,price:"¥3,000〜5,000",likes:42,liked:false,comments:7,createdAt:"2日前",review:"毎年何を贈ろうか迷うのですが、今年は地元の味で攻めてみました。食べた瞬間に「これ美味しい！」と電話がきて、ちょっと泣きそうになりました。",lat:41.7687,lng:140.7288,locationName:"函館駅"},
  {id:"2",userName:"kota.gifts",userAvatar:"K",avatarColor:"#4A7C6F",giftEmoji:"🕯️",giftBg:"linear-gradient(135deg,#f0ebe0,#e8d5c4)",giftName:"DIPTYQUE キャンドル",recipient:"友人（女性）",scene:"引越し祝い",category:"インテリア",rating:5,price:"¥5,000〜10,000",likes:31,liked:false,comments:4,createdAt:"4日前",review:"新居に映える、ちょっと贅沢なキャンドルを探していて。包装も素敵で、渡した瞬間に「わあ！」って顔してくれた。",lat:43.0618,lng:141.3545,locationName:"札幌市中央区"},
  {id:"3",userName:"yuri_life",userAvatar:"Y",avatarColor:"#E8A87C",giftEmoji:"🎭",giftBg:"linear-gradient(135deg,#e8f0f5,#d4e8f0)",giftName:"劇団四季チケット（2枚）",recipient:"両親",scene:"結婚記念日",category:"体験・チケット",rating:4,price:"¥10,000〜",likes:58,liked:false,comments:12,createdAt:"1週間前",review:"物より体験を、と思って選びました。帰ってきて「久しぶりに二人でデートしてきた」と嬉しそうに話してくれました。",lat:35.6762,lng:139.6503,locationName:"東京"},
  {id:"4",userName:"miu_h",userAvatar:"M",avatarColor:"#C17B74",giftEmoji:"💐",giftBg:"linear-gradient(135deg,#fce8f0,#f5c8d8)",giftName:"プリザーブドフラワーアレンジ",recipient:"姉",scene:"出産祝い",category:"フラワー",rating:5,price:"¥5,000〜10,000",likes:76,liked:false,comments:15,createdAt:"3週間前",review:"プリザーブドなので枯れないのが最大の魅力。1年経った今もリビングに飾ってあると言ってくれて嬉しい。",lat:43.0618,lng:141.3545,locationName:"札幌市中央区"},
  {id:"5",userName:"aina.ainu",userAvatar:"A",avatarColor:"#9B7EC8",giftEmoji:"🪶",giftBg:"linear-gradient(135deg,#f3edf8,#e0d0f0)",giftName:"アイヌ文様の刺繍ピアス",recipient:"友人（女性）",scene:"その他",category:"ファッション・アクセサリー",rating:5,price:"¥3,000〜5,000",likes:23,liked:false,comments:3,createdAt:"5日前",review:"旭川の作家さんが作ったピアス。お菓子だけじゃなく身につけられるお土産を探していて見つけました。旅の話をしながら渡せるのがいい。",lat:43.7706,lng:142.3649,locationName:"旭川市"},
  {id:"6",userName:"ryo_wood",userAvatar:"R",avatarColor:"#7B8FA1",giftEmoji:"🦉",giftBg:"linear-gradient(135deg,#eef2f5,#dbe4ec)",giftName:"木彫りの梟（ふくろう）小物",recipient:"祖父母",scene:"その他",category:"雑貨・伝統工芸",rating:4,price:"¥3,000〜5,000",likes:19,liked:false,comments:2,createdAt:"1日前",review:"北海道の木彫り工芸品。ちょっと渋いけど、玄関に飾ってくれて「縁起がいいね」と喜んでもらえた。",lat:42.7752,lng:141.6923,locationName:"新千歳空港"},
];

const POSTS_EN = [
  {id:"1",userName:"Emma_R",userAvatar:"E",avatarColor:"#C17B74",giftEmoji:"🍫",giftBg:"linear-gradient(135deg,#f8e8d4,#ffd9b3)",giftName:"Artisan Chocolate Box",recipient:"Mother",scene:"Birthday",category:"Food & Drink",rating:5,price:"¥3,000–5,000",likes:38,liked:false,comments:6,createdAt:"2 days ago",review:"Found this beautiful handmade chocolate box from a small Kyoto chocolatier. My mom was completely floored — she called me twice to say thank you.",lat:35.0116,lng:135.7681,locationName:"Kyoto"},
  {id:"2",userName:"james.g",userAvatar:"J",avatarColor:"#4A7C6F",giftEmoji:"🕯️",giftBg:"linear-gradient(135deg,#f0ebe0,#e8d5c4)",giftName:"DIPTYQUE Baies Candle",recipient:"Female Friend",scene:"Housewarming",category:"Home & Decor",rating:5,price:"¥5,000–10,000",likes:44,liked:false,comments:8,createdAt:"4 days ago",review:"An absolute crowd-pleaser for a housewarming. The scent fills the whole room without being overwhelming.",lat:43.0618,lng:141.3545,locationName:"Sapporo"},
  {id:"3",userName:"sofia_t",userAvatar:"S",avatarColor:"#E8A87C",giftEmoji:"🌿",giftBg:"linear-gradient(135deg,#e8f5e8,#c8e6c8)",giftName:"Japanese Matcha Kit",recipient:"Partner",scene:"Anniversary",category:"Food & Drink",rating:5,price:"¥5,000–10,000",likes:62,liked:false,comments:10,createdAt:"1 week ago",review:"We're both obsessed with Japanese tea culture, and this matcha kit from Uji was exactly what he wanted.",lat:34.8844,lng:135.7996,locationName:"Uji"},
  {id:"4",userName:"nina_f",userAvatar:"N",avatarColor:"#9B7EC8",giftEmoji:"💐",giftBg:"linear-gradient(135deg,#fce8f0,#f5c8d8)",giftName:"Preserved Flower Arrangement",recipient:"Mother",scene:"Mother's Day",category:"Flowers",rating:5,price:"¥5,000–10,000",likes:91,liked:false,comments:18,createdAt:"3 weeks ago",review:"Unlike fresh flowers, these last for years. She sent me a photo a month later saying they still look beautiful.",lat:43.0618,lng:141.3545,locationName:"Sapporo"},
  {id:"5",userName:"aina.ainu",userAvatar:"A",avatarColor:"#9B7EC8",giftEmoji:"🪶",giftBg:"linear-gradient(135deg,#f3edf8,#e0d0f0)",giftName:"Ainu Pattern Embroidered Earrings",recipient:"Female Friend",scene:"Other",category:"Fashion & Accessories",rating:5,price:"¥3,000–5,000",likes:17,liked:false,comments:2,createdAt:"5 days ago",review:"Handmade by an artisan in Asahikawa. I wanted something wearable, not just sweets — perfect conversation piece.",lat:43.7706,lng:142.3649,locationName:"Asahikawa"},
  {id:"6",userName:"ryo_wood",userAvatar:"R",avatarColor:"#7B8FA1",giftEmoji:"🦉",giftBg:"linear-gradient(135deg,#eef2f5,#dbe4ec)",giftName:"Carved Wooden Owl",recipient:"Grandparents",scene:"Other",category:"Crafts & Traditional Goods",rating:4,price:"¥3,000–5,000",likes:14,liked:false,comments:1,createdAt:"1 day ago",review:"A traditional Hokkaido woodcraft piece. A little old-fashioned but they loved displaying it by the entrance.",lat:42.7752,lng:141.6923,locationName:"New Chitose Airport"},
];

// ══════════════════════════════════════════════════
// 💾 お土産データベース（釧路・北見・ヘルシー系を追加拡張）
// ══════════════════════════════════════════════════
const SOUVENIR_DB = [
  {id:"s1",region:"旭川",name:"六花亭 マルセイバターサンド",category:"グルメ",tags:["甘い物","定番"],emoji:"🍪",price:"¥1,000〜3,000",shop:"六花亭 旭川店",lat:43.7651,lng:142.3551},
  {id:"s2",region:"旭川",name:"ロバ菓子司 蔵生（くらなま）",category:"グルメ",tags:["サクサク","生チョコクッキー"],emoji:"🍪",price:"〜¥1,000",shop:"The Sun 蔵人 本店",lat:43.7542,lng:142.3812},
  {id:"s3",region:"旭川",name:"あさひかわ牧場 特製プリン",category:"グルメ",tags:["とろける","スイーツ"],emoji:"🍮",price:"〜¥1,000",shop:"旭川駅お土産売店",lat:43.7628,lng:142.3584},
  {id:"s4",region:"札幌",name:"石屋製菓 白い恋人",category:"グルメ",tags:["大定番","サクサク"],emoji:"🟨",price:"¥1,000〜3,000",shop:"白い恋人パーク",lat:43.0883,lng:141.2711},
  {id:"s5",region:"函館",name:"スナッフルス チーズオムレット",category:"グルメ",tags:["ふわふわ","濃厚"],emoji:"🧀",price:"¥1,000〜3,000",shop:"函館駅前店",lat:41.7731,lng:140.7264},
  {id:"s6",region:"釧路",name:"阿寒湖 まりも羊羹",category:"グルメ",tags:["定番","阿寒湖","和菓子"],emoji:"🍡",price:"〜¥1,000",shop:"阿寒湖温泉街 土産店",lat:43.4306,lng:144.0956},
  {id:"s7",region:"釧路",name:"マリモガラスのペンダント",category:"ファッション・アクセサリー",tags:["ペンダント","マリモ","ガラス","アクセサリー"],emoji:"📿",price:"¥1,000〜3,000",shop:"阿寒湖アイヌコタン",lat:43.4322,lng:144.0871},
  {id:"s8",region:"釧路",name:"アイヌ文様 木彫りペンダント",category:"ファッション・アクセサリー",tags:["ペンダント","木彫り","アイヌ文様","アクセサリー"],emoji:"🪵",price:"¥3,000〜5,000",shop:"阿寒湖アイヌコタン 工芸店",lat:43.4322,lng:144.0871},
  {id:"s9",region:"北見",name:"北見ハッカ飴",category:"グルメ",tags:["ヘルシー","さっぱり","飴"],emoji:"🍬",price:"〜¥1,000",shop:"北見ハッカ記念館 売店",lat:43.8029,lng:143.8946},
  {id:"s10",region:"函館",name:"がごめ昆布スナック",category:"グルメ",tags:["ヘルシー","昆布","おつまみ"],emoji:"🌿",price:"〜¥1,000",shop:"函館朝市",lat:41.7717,lng:140.7256},
];

// ══════════════════════════════════════════════════════════════════
// 🔎 SOUVENIR_DB 検索ロジック
// ------------------------------------------------------------------
// matchSouvenirs : スコア>0の全件をスコア降順で返す（一覧のキーワード検索用）
// searchSouvenirs: matchSouvenirsの上位3件のみ（アゲハトチャットの返答用）
// 将来的にバックエンドAPI (GET /api/souvenirs/search?q=...) に差し替え可能な
// 純粋関数として独立させている。
// ══════════════════════════════════════════════════════════════════
function matchSouvenirs(query, db = SOUVENIR_DB) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  const scored = db.map((item) => {
    let score = 0;
    const fields = [
      { value: item.name, weight: 3 },
      { value: item.shop, weight: 2 },
      { value: item.region, weight: 2 },
      { value: item.category, weight: 1 },
      { value: (item.tags || []).join(" "), weight: 1 },
    ];
    fields.forEach(({ value, weight }) => {
      if (value && value.toLowerCase().includes(q)) score += weight;
    });
    (item.tags || []).forEach((tag) => {
      if (tag.toLowerCase().includes(q) || q.includes(tag.toLowerCase())) score += 1;
    });
    // 地域名がクエリ文中に含まれる場合もスコア加点（「釧路のお土産は？」等の文章対応）
    if (item.region && q.includes(item.region.toLowerCase())) score += 2;
    if (item.name && q.includes(item.name.toLowerCase())) score += 3;
    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

function searchSouvenirs(query, db = SOUVENIR_DB) {
  return matchSouvenirs(query, db).slice(0, 3);
}

// ══════════════════════════════════════════════════════════════════
// 🐦 アゲハトの返答文生成ロジック
// ══════════════════════════════════════════════════════════════════
function buildAgehatoReply(query, matches, lang) {
  if (matches.length === 0) {
    return {
      text:
        lang === "ja"
          ? `「${query}」に近いお土産、DBの中では見つからなかったっぽ…😢\n地域名（例：旭川、札幌、釧路）やカテゴリ（グルメ、雑貨）でもう一度聞いてみてほしいっぽ！`
          : `Hmm, I couldn't find anything close to "${query}" in the database-ppo…😢\nTry asking with a region (e.g. Asahikawa, Sapporo, Kushiro) or category (Food, Crafts) instead-ppo!`,
      expression: "concerned",
    };
  }

  const top = matches[0];
  const introOthers =
    matches.length > 1
      ? lang === "ja"
        ? `\n\n他にも「${matches.slice(1).map((m) => m.name).join("」「")}」もおすすめだっぽ！`
        : `\n\nAlso worth checking out: ${matches.slice(1).map((m) => m.name).join(", ")}!`
      : "";

  const text =
    lang === "ja"
      ? `${top.emoji} 「${top.name}」がおすすめだっぽ！\n${top.shop}（${top.region}）で買えるっぽよ。\n特徴：${(top.tags || []).join("・")}、価格帯は${top.price}だっぽ〜✨${introOthers}`
      : `${top.emoji} I'd recommend "${top.name}"-ppo!\nYou can find it at ${top.shop} (${top.region}).\nFeatures: ${(top.tags || []).join(", ")}, price range ${top.price}-ppo~✨${introOthers}`;

  return { text, expression: matches.length > 1 ? "celebrate" : "happy" };
}

// ══════════════════════════════════════════════════════════════════
// 🧠 アゲハトの頭脳（文脈保持・雑談・蔵生Q&A・ダイエット対応の統合ロジック）
// ------------------------------------------------------------------
// 優先順位:
//   1. 雑談（愛してる/ありがとう等）→ デレ表情「tokimeki」で返す
//   2. 蔵生×健康 → 素材のこだわりを熱く語り、公式情報へのリンクを添える
//   3. ダイエット → 脂質に注意しつつヘルシー系お土産（ハッカ飴・昆布スナック）を提案
//   4. DB検索（文脈対応）→ 直前の地域(lastRegion)を記憶し、
//      「釧路のお土産は？」→「ペンダントとかある？」で釧路のペンダントを返す。
//      システム的な言い訳は一切口にせず、自然に文脈を引き継ぐ。
// 戻り値: { text, expression, context } — contextは次ターンへ引き継がれる
// ══════════════════════════════════════════════════════════════════
const CHAT_REGIONS = ["旭川","札幌","函館","釧路","北見","小樽","帯広","富良野"];

function agehatoBrainLogic(userMsg, context, lang) {
  const msg = userMsg.trim();
  const lower = msg.toLowerCase();
  const keepContext = { ...context };

  // ---- 1. 雑談（デレ・照れ） ----
  if (/(愛してる|あいしてる|大好き|だいすき|好きだよ|love you|luv you)/i.test(msg)) {
    return {
      text:
        lang === "ja"
          ? "え、えぇっ！？　ぼ、僕も…だ、大好きだっぽ…！\nそんなこと言われたら、羽まで真っピンクになっちゃうっぽ〜〜🩷\nこれからも、あなたのお土産選びをぜんりょくで手伝わせてほしいっぽ！"
          : "W-what!? I… I love you too-ppo…!\nYou're making my feathers turn all pink-ppo~~ 🩷\nLet me keep helping you find the best souvenirs, always-ppo!",
      expression: "tokimeki",
      context: keepContext,
    };
  }
  if (/(ありがとう|ありがと|感謝|thank you|thanks|thx)/i.test(msg)) {
    return {
      text:
        lang === "ja"
          ? "ど、どういたしましてだっぽ…！\nそんなふうに言ってもらえると、照れて羽がピンクになっちゃうっぽ🩷\nまたいつでも聞いてほしいっぽ〜！"
          : "Y-you're welcome-ppo…!\nHearing that makes me blush all pink-ppo 🩷\nAsk me anything, anytime-ppo~!",
      expression: "tokimeki",
      context: keepContext,
    };
  }
  if (/(かわいい|可愛い|cute)/i.test(msg)) {
    return {
      text:
        lang === "ja"
          ? "か、かわいい…！？ぼ、僕のこと…？\nうう、照れるっぽ〜〜🩷🩷"
          : "C-cute…!? You mean… me…?\nAww, I'm blushing so hard-ppo~~ 🩷🩷",
      expression: "tokimeki",
      context: keepContext,
    };
  }

  // ---- 2. 蔵生 × 健康 ----
  if (/蔵生|くらなま|kuranama/i.test(msg) && /(健康|体にいい|からだにいい|ヘルシー|healthy|health)/i.test(msg)) {
    return {
      text:
        lang === "ja"
          ? "🍪 蔵生のこだわり、聞いてくれてうれしいっぽ！！\n蔵生はね、北海道産小麦粉と、てんさい由来のビートグラニュー糖を100%使用していて、保存料も使っていない、素材にとことん真面目なお菓子なんだっぽ✨\nしっとりサクサクの生地に、とろける生チョコ…罪深いほどおいしいっぽ〜！\n\nただ、生チョコ系だから食べ過ぎには注意っぽよ。詳しい原材料やアレルギー情報は [ロバ菓子司の公式情報をチェック](https://www.google.com/search?q=%E8%94%B5%E7%94%9F+%E3%83%AD%E3%83%90%E8%8F%93%E5%AD%90%E5%8F%B8+%E5%85%AC%E5%BC%8F) してほしいっぽ！"
          : "🍪 So glad you asked about Kuranama-ppo!!\nIt's made with 100% Hokkaido wheat flour and beet granulated sugar, with no preservatives — a seriously honest sweet-ppo✨\nThat soft, crumbly cookie with melting nama-chocolate inside… dangerously delicious-ppo~!\n\nThat said, it's still a chocolate treat, so don't overdo it-ppo. For details, [check the official Roba Kashi-tsukasa info](https://www.google.com/search?q=Kuranama+Roba+Kashi+official)-ppo!",
      expression: "happy",
      context: keepContext,
    };
  }

  // ---- 3. ダイエット対応 ----
  if (/(ダイエット|痩せ|やせ|カロリー|糖質制限|diet)/i.test(msg)) {
    return {
      text:
        lang === "ja"
          ? "ダイエット中なんだっぽね…えらいっぽ…！🥺\n正直に言うと、蔵生みたいな生チョコ系はおいしいぶん脂質が高めだから、量には気をつけてほしいっぽ。\n\nかわりに、こんなヘルシー系お土産はどうっぽ？\n🍬 北見ハッカ飴 … すっきり爽やか、少量で満足感があるっぽ\n🌿 がごめ昆布スナック … ミネラル豊富で、小腹満たしにもぴったりっぽ\n\n無理せず、楽しくがいちばんだっぽ〜！応援してるっぽ💪"
          : "You're on a diet-ppo…? That's amazing-ppo…!🥺\nTo be honest, nama-chocolate sweets like Kuranama are high in fat, so go easy on those-ppo.\n\nInstead, how about these healthier picks-ppo?\n🍬 Kitami Mint Candy … refreshing and satisfying in small amounts-ppo\n🌿 Gagome Kombu Snack … mineral-rich, perfect for light snacking-ppo\n\nTake it easy and enjoy the journey-ppo! I'm rooting for you-ppo💪",
      expression: "happy",
      context: keepContext,
    };
  }

  // ---- 4. DB検索（地域の文脈を保持） ----
  const foundRegion = CHAT_REGIONS.find((r) => msg.includes(r));
  const effectiveRegion = foundRegion || context.lastRegion || null;
  if (foundRegion) keepContext.lastRegion = foundRegion;

  let matches = searchSouvenirs(msg);
  if (effectiveRegion) {
    const regionFiltered = matchSouvenirs(msg).filter((m) => m.region === effectiveRegion).slice(0, 3);
    if (regionFiltered.length > 0) {
      matches = regionFiltered;
      keepContext.lastRegion = effectiveRegion;
    } else if (matches.length === 0) {
      // 「釧路」だけ言われた場合など、地域名のみで該当地域の全件を返す
      const regionAll = SOUVENIR_DB.filter((m) => m.region === effectiveRegion).slice(0, 3);
      if (regionAll.length > 0) {
        matches = regionAll;
        keepContext.lastRegion = effectiveRegion;
      }
    }
  }

  const reply = buildAgehatoReply(msg, matches, lang);
  return { ...reply, context: keepContext };
}

// ══════════════════════════════════════════════════════════════════
// 🔗 チャット本文レンダリング（Markdownリンク対応）
// ------------------------------------------------------------------
// [表示名](URL) 形式を自動検出し、青文字・下線付きの<a>に変換して
// 別タブ（target="_blank"）で開く。それ以外の文字列はそのまま表示。
// ══════════════════════════════════════════════════════════════════
function renderChatText(text) {
  const parts = [];
  const regex = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m, k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={`lk-${k++}`} href={m[2]} target="_blank" rel="noopener noreferrer" style={{ color: "#3D7CB8", textDecoration: "underline", fontWeight: "bold" }}>
        {m[1]}
      </a>
    );
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ══════════════════════════════════════════════════════════════════
// 🧩 分離コンポーネント①：Header（変更なし・Presentational component）
// ══════════════════════════════════════════════════════════════════
function Header({ t, lang, onToggleLang, isLoggedIn, userLv, userXp }) {
  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "24px" }}>🎁</span>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#3D7CB8" }}>
            agete <span style={{ fontSize: "12px", background: "#FFAB76", color: "#fff", padding: "1px 5px", borderRadius: "10px" }}>App</span>
          </h1>
          <p style={{ fontSize: "10px", margin: 0, color: "#718096" }}>{t.appSub}</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {isLoggedIn && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#EEF2F6", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>
            <span style={{ fontWeight: "bold", color: "#3D7CB8" }}>{t.levelLabel}{userLv}</span>
            <div style={{ width: "50px", height: "6px", background: "#CBD5E1", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${userXp}%`, height: "100%", background: "#5B9BD5" }} />
            </div>
            <span style={{ fontSize: "10px", color: "#64748B" }}>{userXp}/100 {t.xpLabel}</span>
          </div>
        )}
        <button
          onClick={onToggleLang}
          style={{ background: "#3D7CB8", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "15px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
        >
          {t.switchLabel}
        </button>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🧩 分離コンポーネント②：AuthGate（isSubmitting/lastAction配線修正済み）
// ══════════════════════════════════════════════════════════════════
function AuthGate({
  t, hatomono, isHatoTalking, authStep, loginId, password, recoveryQ, recoveryA,
  authError, isSubmitting, lastAction,
  onChangeLoginId, onChangePassword, onChangeRecoveryQ, onChangeRecoveryA,
  onLineLogin, onGotoSignup, onGotoLogin, onSubmit, onFinalizeLogin,
}) {
  return (
    <div style={{ maxWidth: "420px", margin: "40px auto", padding: "24px", background: "#fff", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <Agehato size={100} expression={hatomono} isTalking={isHatoTalking} />
      </div>

      {authStep === "welcome" && (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.authTagline}</h2>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 24px 0" }}>{t.authSubtitle}</p>
          <blockquote style={{ background: "#F1F5F9", padding: "10px", borderRadius: "8px", fontSize: "12px", fontStyle: "italic", margin: "0 0 24px 0" }}>
            「{t.authAgehatoHello}」
          </blockquote>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={onLineLogin}
              disabled={isSubmitting}
              style={{ width: "100%", background: "#06C755", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <span>{isSubmitting ? t.authSubmitting : t.authLineBtn}</span>
              <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.9 }}>{t.authLineBtnSub}</span>
            </button>

            <button
              onClick={onGotoSignup}
              disabled={isSubmitting}
              style={{ width: "100%", background: "#F8FAFC", color: "#334155", border: "1px solid #CBD5E1", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <span>{t.authIdpassBtn}</span>
              <span style={{ fontSize: "10px", color: "#64748B", fontWeight: "normal" }}>{t.authIdpassBtnSub}</span>
            </button>
          </div>
        </div>
      )}

      {(authStep === "signup_id" || authStep === "login_id") && (
        <form onSubmit={onSubmit} style={{ textAlign: "left" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", textAlign: "center" }}>
            {authStep === "signup_id" ? t.authIdpassBtn : t.authLoginLink}
          </h3>

          {authError && <p style={{ color: "#EF4444", fontSize: "12px", marginBottom: "12px" }}>⚠️ {authError}</p>}

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{t.authLoginId}</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => onChangeLoginId(e.target.value)}
              placeholder={t.authLoginIdHint}
              style={{ width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "6px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{t.authPassword}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "6px", boxSizing: "border-box" }}
            />
          </div>

          {authStep === "signup_id" && (
            <div style={{ marginBottom: "20px", background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px dashed #CBD5E1" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#475569" }}>{t.authRecoveryTitle}</label>
              <p style={{ fontSize: "10px", color: "#64748B", margin: "0 0 8px 0" }}>{t.authRecoveryHint}</p>
              <select
                value={recoveryQ}
                onChange={(e) => onChangeRecoveryQ(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "12px", marginBottom: "8px" }}
              >
                <option value="">{t.authRecoverySelectPh}</option>
                {t.recoveryPresets.map((q, idx) => <option key={idx} value={q}>{q}</option>)}
              </select>
              <input
                type="text"
                value={recoveryA}
                onChange={(e) => onChangeRecoveryA(e.target.value)}
                placeholder={t.authRecoveryAnswer}
                style={{ width: "100%", padding: "8px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
          )}

          <button type="submit" disabled={isSubmitting} style={{ width: "100%", background: isSubmitting ? "#A9C7E6" : "#5B9BD5", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", marginBottom: "12px" }}>
            {isSubmitting ? t.authSubmitting : authStep === "signup_id" ? t.authSubmitSignupId : t.authSubmitLoginId}
          </button>

          <div style={{ textAlign: "center", fontSize: "12px", color: "#64748B" }}>
            {authStep === "signup_id" ? (
              <span>{t.authSwitchToLogin} <a href="#" onClick={(e) => { e.preventDefault(); onGotoLogin(); }} style={{ color: "#3D7CB8", fontWeight: "bold" }}>{t.authLoginLink}</a></span>
            ) : (
              <span>{t.authSwitchToSignup} <a href="#" onClick={(e) => { e.preventDefault(); onGotoSignup(); }} style={{ color: "#3D7CB8", fontWeight: "bold" }}>{t.authSignupLink}</a></span>
            )}
          </div>
        </form>
      )}

      {authStep === "success" && (
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#4A7C6F", marginBottom: "8px" }}>
            {lastAction === "login" ? t.authAgehatoWelcomeBack : t.authSuccessTitle}
          </h3>
          <p style={{ fontSize: "14px", color: "#475569", marginBottom: "24px" }}>
            {lastAction === "login" ? t.authWelcomeBackBody : t.authSuccessBody}
          </p>
          <button
            onClick={onFinalizeLogin}
            style={{ background: "#5B9BD5", color: "#fff", border: "none", padding: "12px 32px", borderRadius: "24px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 4px 12px rgba(91,155,213,0.3)" }}
          >
            {t.authSuccessCta}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🧩 分離コンポーネント③：PostCard（変更なし）
// ══════════════════════════════════════════════════════════════════
function PostCard({ t, post, distance, onLike }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: post.avatarColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px" }}>
            {post.userAvatar}
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "bold" }}>{post.userName}</div>
            <div style={{ fontSize: "10px", color: "#A0AEC0" }}>
              {post.createdAt} • {post.locationName}
              {distance != null && <span style={{ color: "#5B9BD5", marginLeft: "4px" }}>📍 {distance}{t.distanceUnit}</span>}
            </div>
          </div>
        </div>
        <span style={{ fontSize: "11px", background: "#EDF2F7", padding: "3px 8px", borderRadius: "4px", color: "#4A5568", fontWeight: "500" }}>{post.category}</span>
      </div>

      <div style={{ display: "flex", gap: "12px", background: "#F8FAFC", padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: post.giftBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
          {post.giftEmoji}
        </div>
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 2px 0" }}>{post.giftName}</h4>
          <p style={{ fontSize: "11px", color: "#718096", margin: 0 }}>
            {t.toLabel}<span style={{ color: "#2D2926", fontWeight: "500" }}>{post.recipient}</span> | {t.sceneLabel}<span style={{ color: "#2D2926", fontWeight: "500" }}>{post.scene}</span>
          </p>
          <p style={{ fontSize: "11px", color: "#718096", margin: 0 }}>
            {t.priceLabel}: <span style={{ color: "#E8A87C", fontWeight: "bold" }}>{post.price}</span>
          </p>
        </div>
      </div>

      <p style={{ fontSize: "13px", lineHeight: "1.5", margin: "0 0 12px 0", color: "#2D2926", whiteSpace: "pre-line" }}>{post.review}</p>

      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #EDF2F7", paddingTop: "10px", fontSize: "12px", color: "#718096" }}>
        <button
          onClick={() => onLike?.(post.id)}
          style={{ background: "none", border: "none", color: post.liked ? "#EF4444" : "#718096", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          {post.liked ? "❤️" : "🤍"} {post.likes}
        </button>
        <span>💬 {post.comments}</span>
        <button style={{ background: "none", border: "none", color: "#3D7CB8", cursor: "pointer" }}>{t.shareBtn}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🧩 分離コンポーネント④：PostForm（縦3欄入力＋自然文プレビュー版）
// ------------------------------------------------------------------
// 仕様: テンプレート枠は完全に削除。代わりに縦3つの入力欄
//   💡 選んだ理由・背景（reviewReason）
//   💬/🥰 相手の反応 or 自分の気持ち（reviewReaction、切替ボタン付き）
//   ✨ おすすめ・その他（reviewOther）
// を設置し、オレンジの確定プレビュー枠に【】等の区切り文字を一切入れず、
// 自然な一本の文章として結合表示する。この結合結果(combinedReview)が
// そのままAIチェック対象・投稿本文になる。
// ══════════════════════════════════════════════════════════════════
function PostForm({
  t, giftName, onChangeGiftName,
  category, categories, onChangeCategory,
  scene, scenes, onChangeScene,
  recipient, recipients, onChangeRecipient,
  price, prices, onChangePrice,
  reviewReason, reviewReaction, reviewOther, reactionMode,
  onChangeReviewPart, onToggleReactionMode,
  combinedReview,
  showAiCheck = true,
  hatomono, isHatoTalking, checkStatus = "waiting", onRunCheck,
  onSubmit, canSubmit,
}) {
  const fieldStyle = { width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "12px", resize: "none", boxSizing: "border-box", lineHeight: 1.5 };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" };

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "14px" }}>{t.modalTitle}</h3>

      {/* 基本情報 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label style={labelStyle}>{t.giftNameLabel}</label>
          <input
            type="text"
            value={giftName}
            onChange={(e) => onChangeGiftName(e.target.value)}
            placeholder={t.giftNamePh}
            style={{ width: "100%", padding: "8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.categoryLabel}</label>
          <select
            value={category}
            onChange={(e) => onChangeCategory(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "12px" }}
          >
            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* シーン・贈り先・価格帯（渡された場合のみ表示） */}
      {(scenes && recipients && prices) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.sceneLabel}</label>
            <select value={scene} onChange={(e) => onChangeScene(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px" }}>
              {scenes.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.recipientLabel}</label>
            <select value={recipient} onChange={(e) => onChangeRecipient(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px" }}>
              {recipients.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>{t.priceLabel}</label>
            <select value={price} onChange={(e) => onChangePrice(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px" }}>
              {prices.map((p, i) => <option key={i} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── 縦3欄の入力エリア ── */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>{t.reviewReasonLabel}</label>
        <textarea
          value={reviewReason}
          onChange={(e) => onChangeReviewPart("reviewReason", e.target.value)}
          placeholder={t.reviewReasonPh}
          rows={2}
          style={fieldStyle}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            {reactionMode === "partner" ? t.reactionPartnerLabel : t.reactionSelfLabel}
          </label>
          <button
            type="button"
            onClick={onToggleReactionMode}
            style={{ background: "#EEF2F6", border: "1px solid #CBD5E1", padding: "2px 10px", borderRadius: "12px", fontSize: "10px", cursor: "pointer", color: "#3D7CB8", fontWeight: "bold" }}
          >
            🔄 {t.reactionSwitch}
          </button>
        </div>
        <textarea
          value={reviewReaction}
          onChange={(e) => onChangeReviewPart("reviewReaction", e.target.value)}
          placeholder={reactionMode === "partner" ? t.reviewReactionPhPartner : t.reviewReactionPhSelf}
          rows={2}
          style={fieldStyle}
        />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>{t.reviewOtherLabel}</label>
        <textarea
          value={reviewOther}
          onChange={(e) => onChangeReviewPart("reviewOther", e.target.value)}
          placeholder={t.reviewOtherPh}
          rows={2}
          style={fieldStyle}
        />
      </div>

      {/* ── 🟧 オレンジの確定プレビュー枠（自然な一本の文章として結合） ── */}
      <div style={{ background: "#FFF7F0", border: "2px solid #FFAB76", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
        <p style={{ fontSize: "11px", fontWeight: "bold", color: "#D97742", margin: "0 0 6px 0" }}>{t.previewLabel}</p>
        {combinedReview ? (
          <p style={{ fontSize: "13px", lineHeight: 1.7, margin: 0, color: "#2D2926" }}>{combinedReview}</p>
        ) : (
          <p style={{ fontSize: "12px", margin: 0, color: "#C8A184", fontStyle: "italic" }}>{t.previewEmpty}</p>
        )}
      </div>

      {/* 🐦 アゲハトAIチェック */}
      {showAiCheck && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Agehato size={55} expression={hatomono} isTalking={isHatoTalking} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "11px", margin: "0 0 6px 0", fontWeight: "bold", color: checkStatus === "error" ? "#EF4444" : "#475569" }}>
                {checkStatus === "waiting" && t.reviewWaiting}
                {checkStatus === "checking" && t.reviewChecking}
                {checkStatus === "ok" && t.reviewOk}
                {checkStatus === "error" && t.reviewError}
              </p>
              <button
                type="button"
                onClick={onRunCheck}
                disabled={!combinedReview || checkStatus === "checking"}
                style={{ background: "#EEF2F6", border: "1px solid #CBD5E1", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", color: "#3D7CB8", fontWeight: "bold" }}
              >
                {t.reviewCheckBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ width: "100%", background: canSubmit ? "#5B9BD5" : "#CBD5E1", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: canSubmit ? "pointer" : "not-allowed", fontSize: "14px", transition: "background 0.2s" }}
      >
        {t.submitBtn}
      </button>

      {showAiCheck && checkStatus !== "ok" && (
        <p style={{ fontSize: "11px", color: "#94A3B8", textAlign: "center", marginTop: "8px" }}>
          🔒 {t.reviewCheckBtn} → {t.reviewWaiting}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🧠 状態管理（useReducerによる一元化）
// ------------------------------------------------------------------
// ドメインごとにネストしたstate + アクションのdispatchで一元管理。
// 「どのアクションでstateがどう変わるか」はこのreducerだけ見れば追える。
// 子コンポーネントは「値」と「onChangeコールバック」だけを受け取る
// Presentational Componentのままにしておく。
// ══════════════════════════════════════════════════

const ACTIONS = {
  // UI（言語・ナビゲーション）
  SET_LANG: "SET_LANG",
  SET_NAV: "SET_NAV",

  // 認証
  AUTH_GOTO_STEP: "AUTH_GOTO_STEP",
  AUTH_SET_LOGIN_ID: "AUTH_SET_LOGIN_ID",
  AUTH_SET_PASSWORD: "AUTH_SET_PASSWORD",
  AUTH_SET_RECOVERY_Q: "AUTH_SET_RECOVERY_Q",
  AUTH_SET_RECOVERY_A: "AUTH_SET_RECOVERY_A",
  AUTH_SUBMIT_START: "AUTH_SUBMIT_START",
  AUTH_SUBMIT_ERROR: "AUTH_SUBMIT_ERROR",
  AUTH_SUBMIT_SUCCESS: "AUTH_SUBMIT_SUCCESS",
  AUTH_LINE_LOGIN_SUCCESS: "AUTH_LINE_LOGIN_SUCCESS",
  AUTH_FINALIZE: "AUTH_FINALIZE",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  SESSION_CHECK_START: "SESSION_CHECK_START",
  SESSION_CHECK_SUCCESS: "SESSION_CHECK_SUCCESS",
  SESSION_CHECK_NONE: "SESSION_CHECK_NONE",

  // ゲーミフィケーション
  AWARD_XP: "AWARD_XP",
  HIDE_XP_ALERT: "HIDE_XP_ALERT",

  // タイムライン・絞り込み
  SET_CATEGORY_FILTER: "SET_CATEGORY_FILTER",
  SET_POST_SEARCH_QUERY: "SET_POST_SEARCH_QUERY",
  SET_DB_SEARCH_QUERY: "SET_DB_SEARCH_QUERY",
  TOGGLE_LIKE: "TOGGLE_LIKE",
  SUBMIT_POST_SUCCESS: "SUBMIT_POST_SUCCESS",

  // 位置情報
  LOCATE_START: "LOCATE_START",
  LOCATE_SUCCESS: "LOCATE_SUCCESS",
  CLEAR_LOCATION_NOTE: "CLEAR_LOCATION_NOTE",

  // アゲハト（表情・チャット）
  SET_AGEHATO_EXPRESSION: "SET_AGEHATO_EXPRESSION",
  SET_CHAT_INPUT: "SET_CHAT_INPUT",
  SEND_CHAT_START: "SEND_CHAT_START",
  SEND_CHAT_SUCCESS: "SEND_CHAT_SUCCESS",
  SEND_CHAT_ERROR: "SEND_CHAT_ERROR",

  // AIレビューチェック
  REVIEW_CHECK_START: "REVIEW_CHECK_START",
  REVIEW_CHECK_OK: "REVIEW_CHECK_OK",
  REVIEW_CHECK_ERROR: "REVIEW_CHECK_ERROR",

  // 投稿フォーム（3欄構成）
  SET_POST_FIELD: "SET_POST_FIELD",
  SET_REVIEW_PART: "SET_REVIEW_PART",
  TOGGLE_REACTION_MODE: "TOGGLE_REACTION_MODE",
  OPEN_POST_MODAL: "OPEN_POST_MODAL",
  CLOSE_POST_MODAL: "CLOSE_POST_MODAL",
};

const initialState = {
  ui: {
    lang: "ja",
    currentNav: "home",
  },
  auth: {
    isLoggedIn: false,
    isCheckingSession: true,
    isSubmitting: false,
    step: "welcome", // welcome | signup_id | login_id | success
    lastAction: null, // "signup" | "login" | null
    loginId: "",
    password: "",
    recoveryQ: "",
    recoveryA: "",
    error: "",
    currentUser: null,
  },
  gamification: {
    level: 1,
    xp: 15,
    showXpAlert: false,
  },
  posts: {
    items: POSTS_JA,
    selectedCategory: "すべて",
    searchQuery: "",
  },
  location: {
    userLocation: null,
    isLocating: false,
    note: "",
  },
  agehato: {
    expression: "idle",
    isTalking: false,
  },
  chat: {
    input: "",
    log: [{ sender: "hato", text: LANG.ja.chatWelcome }],
    context: { lastRegion: null }, // 文脈保持：直前に話題になった地域
  },
  db: {
    searchQuery: "",
  },
  postForm: {
    modalOpen: false,
    giftName: "",
    category: LANG.ja.categories[1],
    reviewReason: "",
    reviewReaction: "",
    reviewOther: "",
    reactionMode: "partner", // partner(💬 相手の反応) | self(🥰 自分の気持ち)
    scene: "",
    recipient: "",
    price: "",
    checkStatus: "waiting", // waiting | checking | ok | error
  },
};

function ageteReducer(state, action) {
  switch (action.type) {
    // ---------- UI ----------
    case ACTIONS.SET_LANG: {
      const newLang = action.payload;
      return {
        ...state,
        ui: { ...state.ui, lang: newLang },
        posts: {
          ...state.posts,
          items: newLang === "ja" ? POSTS_JA : POSTS_EN,
          selectedCategory: newLang === "ja" ? "すべて" : "All",
        },
        postForm: { ...state.postForm, category: LANG[newLang].categories[1] },
        chat: { input: "", log: [{ sender: "hato", text: LANG[newLang].chatWelcome }], context: { lastRegion: null } },
      };
    }
    case ACTIONS.SET_NAV:
      return { ...state, ui: { ...state.ui, currentNav: action.payload } };

    // ---------- 認証 ----------
    case ACTIONS.AUTH_GOTO_STEP:
      return {
        ...state,
        auth: {
          ...state.auth,
          step: action.payload,
          error: "",
          lastAction:
            action.payload === "signup_id" ? "signup" : action.payload === "login_id" ? "login" : state.auth.lastAction,
        },
      };
    case ACTIONS.AUTH_SET_LOGIN_ID:
      return { ...state, auth: { ...state.auth, loginId: action.payload } };
    case ACTIONS.AUTH_SET_PASSWORD:
      return { ...state, auth: { ...state.auth, password: action.payload } };
    case ACTIONS.AUTH_SET_RECOVERY_Q:
      return { ...state, auth: { ...state.auth, recoveryQ: action.payload } };
    case ACTIONS.AUTH_SET_RECOVERY_A:
      return { ...state, auth: { ...state.auth, recoveryA: action.payload } };
    case ACTIONS.AUTH_SUBMIT_START:
      return { ...state, auth: { ...state.auth, isSubmitting: true, error: "" } };
    case ACTIONS.AUTH_SUBMIT_ERROR:
      return {
        ...state,
        auth: {
          ...state.auth,
          isSubmitting: false,
          error: action.payload.message,
          password: action.payload.clearPassword ? "" : state.auth.password,
        },
        agehato: { ...state.agehato, expression: "concerned" },
      };
    case ACTIONS.AUTH_SUBMIT_SUCCESS:
      return {
        ...state,
        auth: {
          ...state.auth,
          isSubmitting: false,
          error: "",
          step: "success",
          password: "",
          currentUser: action.payload.user,
        },
        agehato: { ...state.agehato, expression: "celebrate" },
      };
    case ACTIONS.AUTH_LINE_LOGIN_SUCCESS:
      return {
        ...state,
        auth: { ...state.auth, isSubmitting: false, isLoggedIn: true, currentUser: action.payload, error: "" },
        ui: { ...state.ui, currentNav: "home" },
        agehato: { ...state.agehato, expression: "happy" },
      };
    case ACTIONS.AUTH_FINALIZE:
      return {
        ...state,
        auth: { ...state.auth, isLoggedIn: true },
        ui: { ...state.ui, currentNav: "home" },
        agehato: { ...state.agehato, expression: "idle" },
      };
    case ACTIONS.AUTH_LOGOUT:
      return {
        ...state,
        auth: { ...state.auth, isLoggedIn: false, step: "welcome", currentUser: null, lastAction: null, loginId: "", password: "" },
        agehato: { ...state.agehato, expression: "idle" },
      };
    case ACTIONS.SESSION_CHECK_START:
      return { ...state, auth: { ...state.auth, isCheckingSession: true } };
    case ACTIONS.SESSION_CHECK_SUCCESS:
      return {
        ...state,
        auth: { ...state.auth, isCheckingSession: false, isLoggedIn: true, currentUser: action.payload },
      };
    case ACTIONS.SESSION_CHECK_NONE:
      return { ...state, auth: { ...state.auth, isCheckingSession: false, isLoggedIn: false } };

    // ---------- ゲーミフィケーション ----------
    case ACTIONS.AWARD_XP: {
      const amount = action.payload ?? 20;
      const nextXp = state.gamification.xp + amount;
      const levelUp = nextXp >= 100;
      return {
        ...state,
        gamification: {
          level: levelUp ? state.gamification.level + 1 : state.gamification.level,
          xp: levelUp ? nextXp - 100 : nextXp,
          showXpAlert: true,
        },
      };
    }
    case ACTIONS.HIDE_XP_ALERT:
      return { ...state, gamification: { ...state.gamification, showXpAlert: false } };

    // ---------- タイムライン・絞り込み ----------
    case ACTIONS.SET_CATEGORY_FILTER:
      return { ...state, posts: { ...state.posts, selectedCategory: action.payload } };
    case ACTIONS.SET_POST_SEARCH_QUERY:
      return { ...state, posts: { ...state.posts, searchQuery: action.payload } };
    case ACTIONS.SET_DB_SEARCH_QUERY:
      return { ...state, db: { ...state.db, searchQuery: action.payload } };
    case ACTIONS.TOGGLE_LIKE: {
      const id = action.payload;
      return {
        ...state,
        posts: {
          ...state.posts,
          items: state.posts.items.map((p) =>
            p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
          ),
        },
      };
    }
    case ACTIONS.SUBMIT_POST_SUCCESS: {
      const newPost = action.payload;
      return {
        ...state,
        posts: { ...state.posts, items: [newPost, ...state.posts.items] },
        postForm: {
          ...state.postForm,
          modalOpen: false,
          giftName: "",
          category: LANG[state.ui.lang].categories[1],
          reviewReason: "",
          reviewReaction: "",
          reviewOther: "",
          checkStatus: "waiting",
        },
        agehato: { ...state.agehato, expression: "celebrate" },
      };
    }

    // ---------- 位置情報 ----------
    case ACTIONS.LOCATE_START:
      return {
        ...state,
        location: { ...state.location, isLocating: true },
        agehato: { ...state.agehato, expression: "thinking" },
      };
    case ACTIONS.LOCATE_SUCCESS:
      return {
        ...state,
        location: { userLocation: action.payload, isLocating: false, note: LANG[state.ui.lang].locationSetNote },
        agehato: { ...state.agehato, expression: "happy" },
      };
    case ACTIONS.CLEAR_LOCATION_NOTE:
      return { ...state, location: { ...state.location, note: "" } };

    // ---------- アゲハト（表情・チャット） ----------
    case ACTIONS.SET_AGEHATO_EXPRESSION:
      return { ...state, agehato: { ...state.agehato, expression: action.payload } };
    case ACTIONS.SET_CHAT_INPUT:
      return { ...state, chat: { ...state.chat, input: action.payload } };
    case ACTIONS.SEND_CHAT_START:
      return {
        ...state,
        chat: { ...state.chat, input: "", log: [...state.chat.log, { sender: "user", text: action.payload }] },
        agehato: { expression: "thinking", isTalking: true },
      };
    case ACTIONS.SEND_CHAT_SUCCESS:
      return {
        ...state,
        chat: {
          ...state.chat,
          log: [...state.chat.log, { sender: "hato", text: action.payload.text }],
          context: action.payload.context || state.chat.context,
        },
        agehato: { expression: action.payload.expression, isTalking: false },
      };
    case ACTIONS.SEND_CHAT_ERROR:
      return {
        ...state,
        chat: { ...state.chat, log: [...state.chat.log, { sender: "hato", text: action.payload.text }] },
        agehato: { expression: "concerned", isTalking: false },
      };

    // ---------- AIレビューチェック ----------
    case ACTIONS.REVIEW_CHECK_START:
      return {
        ...state,
        postForm: { ...state.postForm, checkStatus: "checking" },
        agehato: { expression: "thinking", isTalking: true },
      };
    case ACTIONS.REVIEW_CHECK_OK:
      return {
        ...state,
        postForm: { ...state.postForm, checkStatus: "ok" },
        agehato: { expression: "celebrate", isTalking: false },
      };
    case ACTIONS.REVIEW_CHECK_ERROR:
      return {
        ...state,
        postForm: { ...state.postForm, checkStatus: "error" },
        agehato: { expression: "concerned", isTalking: false },
      };

    // ---------- 投稿フォーム（3欄構成） ----------
    case ACTIONS.SET_POST_FIELD:
      return { ...state, postForm: { ...state.postForm, [action.payload.field]: action.payload.value } };
    case ACTIONS.SET_REVIEW_PART:
      // 3欄のいずれかが書き換わったら、チェック済みステータスを自動で無効化する
      return {
        ...state,
        postForm: { ...state.postForm, [action.payload.field]: action.payload.value, checkStatus: "waiting" },
      };
    case ACTIONS.TOGGLE_REACTION_MODE:
      return {
        ...state,
        postForm: { ...state.postForm, reactionMode: state.postForm.reactionMode === "partner" ? "self" : "partner" },
      };
    case ACTIONS.OPEN_POST_MODAL:
      return { ...state, postForm: { ...state.postForm, modalOpen: true } };
    case ACTIONS.CLOSE_POST_MODAL:
      return { ...state, postForm: { ...state.postForm, modalOpen: false } };

    default:
      return state;
  }
}

// ══════════════════════════════════════════════════════════════════
// 🔐 authService（本番API連携を見据えた認証サービス層）
// ------------------------------------------------------------------
// USE_MOCK_AUTH で「実際のfetch()」と「疑似応答」を切り替える。
// バックエンドが用意でき次第 false にするだけで本番接続へ切り替え可能。
// セッションは httpOnly / Secure / SameSite=Lax Cookie で管理し、
// フロントはトークンを一切保持しない方針（XSS対策）。
// ══════════════════════════════════════════════════════════════════
const USE_MOCK_AUTH = true; // ← バックエンドAPIが用意でき次第 false にする

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockUserStore = new Map();

async function parseAuthResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    // 204などボディが無い場合は無視
  }
  if (res.ok) return { ok: true, user: body?.user ?? null };
  return { ok: false, code: body?.code || "UNKNOWN_ERROR", status: res.status };
}

const authService = {
  async signup({ loginId, password, recoveryQuestion, recoveryAnswer }) {
    if (!USE_MOCK_AUTH) {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ loginId, password, recoveryQuestion, recoveryAnswer }),
      });
      return parseAuthResponse(res);
    }
    await sleep(900);
    if (mockUserStore.has(loginId)) return { ok: false, code: "DUPLICATE_ID" };
    mockUserStore.set(loginId, { password, recoveryQuestion, recoveryAnswer });
    return { ok: true, user: { loginId } };
  },

  async login({ loginId, password }) {
    if (!USE_MOCK_AUTH) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ loginId, password }),
      });
      return parseAuthResponse(res);
    }
    await sleep(900);
    const record = mockUserStore.get(loginId);
    if (!record || record.password !== password) return { ok: false, code: "INVALID_CREDENTIALS" };
    return { ok: true, user: { loginId } };
  },

  async logout() {
    if (!USE_MOCK_AUTH) {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      return;
    }
    await sleep(200);
  },

  async getCurrentUser() {
    if (!USE_MOCK_AUTH) {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return { ok: false };
      return parseAuthResponse(res);
    }
    await sleep(300);
    return { ok: false };
  },

  async startLineLogin() {
    if (!USE_MOCK_AUTH) {
      window.location.href = "/api/auth/line/start";
      return { ok: false };
    }
    await sleep(900);
    return { ok: true, user: { loginId: "line_user" } };
  },
};

// ══════════════════════════════════════════════════
// 🏠 AgeteApp（コンテナコンポーネント）
// ------------------------------------------------------------------
// useReducerからstate/dispatchを受け取り、ドメインごとに分割代入。
// 新規: セッション自動チェック(useEffect) / 左右スワイプでのタブ移動 /
//       450px固定・自動スクロール禁止のチャットログUI / 3欄→自然文結合
// ══════════════════════════════════════════════════
const NAV_ORDER = ["home", "search", "post", "me"];

export default function AgeteApp() {
  const [state, dispatch] = useReducer(ageteReducer, initialState);

  const { lang, currentNav } = state.ui;
  const {
    isLoggedIn, isCheckingSession, isSubmitting, step: authStep, lastAction,
    loginId, password, recoveryQ, recoveryA, error: authError,
  } = state.auth;
  const { level: userLv, xp: userXp, showXpAlert } = state.gamification;
  const { items: posts, selectedCategory, searchQuery: postSearchQuery } = state.posts;
  const { userLocation, isLocating, note: locationNote } = state.location;
  const { expression: hatomono, isTalking: isHatoTalking } = state.agehato;
  const { input: chatInput, log: chatLog, context: chatContext } = state.chat;
  const { searchQuery: dbSearchQuery } = state.db;
  const {
    modalOpen, giftName: newGiftName, category: newPostCategory,
    reviewReason, reviewReaction, reviewOther, reactionMode,
    scene: selectedScene, recipient: selectedRecipient, price: selectedPrice,
    checkStatus,
  } = state.postForm;

  const demoAsahikawa = { lat: 43.7628, lng: 142.3584 };
  const t = LANG[lang];

  // スワイプ検出用（stateにする必要がないためuseRefで保持）
  const touchStartRef = useRef({ x: 0, y: 0 });

  // ══════════════════════════════════════════════════
  // 📝 3欄 → 自然な一本の文章への結合
  // 【】などの区切り見出し文字は一切入れず、各欄の末尾に句点がなければ
  // 「。」を補って繋げるだけの、タイムラインそのままの自然文にする。
  // ══════════════════════════════════════════════════
  const combineReviewParts = (...parts) =>
    parts
      .map((p) => (p || "").trim())
      .filter(Boolean)
      .map((s) => (/[。．.!！?？…♪〜～]$/.test(s) ? s : s + "。"))
      .join("");

  const combinedReview = combineReviewParts(reviewReason, reviewReaction, reviewOther);

  // ══════════════════════════════════════════════════
  // 🔑 初回マウント時：既存セッションの有無をサーバーに確認
  // ══════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await authService.getCurrentUser();
        if (cancelled) return;
        if (result.ok) dispatch({ type: ACTIONS.SESSION_CHECK_SUCCESS, payload: result.user });
        else dispatch({ type: ACTIONS.SESSION_CHECK_NONE });
      } catch (_) {
        if (!cancelled) dispatch({ type: ACTIONS.SESSION_CHECK_NONE });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const handleLocate = () => {
    dispatch({ type: ACTIONS.LOCATE_START });
    setTimeout(() => {
      dispatch({ type: ACTIONS.LOCATE_SUCCESS, payload: demoAsahikawa });
      setTimeout(() => dispatch({ type: ACTIONS.CLEAR_LOCATION_NOTE }), 3000);
    }, 1200);
  };

  // ══════════════════════════════════════════════════
  // 👉 左右スワイプでタブ移動（home ⇄ search ⇄ post ⇄ me）
  // 縦スクロールとの誤爆を防ぐため、横移動60px以上かつ横>縦のときのみ発火。
  // モーダル表示中は無効化する。
  // ══════════════════════════════════════════════════
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (e) => {
    if (modalOpen) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const idx = NAV_ORDER.indexOf(currentNav);
    const nextIdx = dx < 0 ? Math.min(idx + 1, NAV_ORDER.length - 1) : Math.max(idx - 1, 0);
    if (nextIdx !== idx) dispatch({ type: ACTIONS.SET_NAV, payload: NAV_ORDER[nextIdx] });
  };

  // ══════════════════════════════════════════════════
  // --- 認証系ハンドラ（authService経由・多重送信防止つき） ---
  // ══════════════════════════════════════════════════
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    // クライアント側バリデーション（この段階のエラーではパスワードを残す）
    if (!loginId || !password) {
      dispatch({ type: ACTIONS.AUTH_SUBMIT_ERROR, payload: { message: t.authErrRequired, clearPassword: false } });
      return;
    }
    if (loginId.length < 3) {
      dispatch({ type: ACTIONS.AUTH_SUBMIT_ERROR, payload: { message: t.authErrLoginIdShort, clearPassword: false } });
      return;
    }
    if (password.length < 8) {
      dispatch({ type: ACTIONS.AUTH_SUBMIT_ERROR, payload: { message: t.authErrPasswordShort, clearPassword: false } });
      return;
    }

    dispatch({ type: ACTIONS.AUTH_SUBMIT_START });
    try {
      const result =
        authStep === "signup_id"
          ? await authService.signup({ loginId, password, recoveryQuestion: recoveryQ, recoveryAnswer: recoveryA })
          : await authService.login({ loginId, password });

      if (result.ok) {
        dispatch({ type: ACTIONS.AUTH_SUBMIT_SUCCESS, payload: { user: result.user } });
      } else {
        const msgMap = {
          DUPLICATE_ID: t.authErrDuplicateId,
          INVALID_CREDENTIALS: t.authErrInvalidCredentials,
          RATE_LIMITED: t.authErrRateLimited,
        };
        dispatch({
          type: ACTIONS.AUTH_SUBMIT_ERROR,
          payload: { message: msgMap[result.code] || t.authErrNetwork, clearPassword: true },
        });
      }
    } catch (_) {
      dispatch({ type: ACTIONS.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: true } });
    }
  };

  const handleLineLogin = async () => {
    if (isSubmitting) return;
    dispatch({ type: ACTIONS.AUTH_SUBMIT_START });
    try {
      const result = await authService.startLineLogin();
      if (result.ok) dispatch({ type: ACTIONS.AUTH_LINE_LOGIN_SUCCESS, payload: result.user });
      else dispatch({ type: ACTIONS.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: false } });
    } catch (_) {
      dispatch({ type: ACTIONS.AUTH_SUBMIT_ERROR, payload: { message: t.authErrNetwork, clearPassword: false } });
    }
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch (_) {}
    dispatch({ type: ACTIONS.AUTH_LOGOUT });
  };

  const finalizeLogin = () => dispatch({ type: ACTIONS.AUTH_FINALIZE });

  // ══════════════════════════════════════════════════
  // ✅ アゲハトAIレビューチェック（結合後の自然文を対象にチェック）
  // ══════════════════════════════════════════════════
  const callAgehatoReviewChecker = async (reviewText) => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const trimmed = reviewText.trim();
    const tooShort = trimmed.length < 10;
    if (tooShort) {
      return { ok: false };
    }
    return { ok: true };
  };

  const handleReviewCheck = async () => {
    if (!combinedReview) return;
    dispatch({ type: ACTIONS.REVIEW_CHECK_START });
    try {
      const result = await callAgehatoReviewChecker(combinedReview);
      dispatch({ type: result.ok ? ACTIONS.REVIEW_CHECK_OK : ACTIONS.REVIEW_CHECK_ERROR });
    } catch (err) {
      dispatch({ type: ACTIONS.REVIEW_CHECK_ERROR });
    }
  };

  // ══════════════════════════════════════════════════
  // 💬 アゲハトAIチャットボット（文脈保持・雑談・蔵生Q&A統合版）
  // 本番ではcallAgehatoBrainの中身をfetch("/api/chat", ...)に差し替えるだけで
  // 呼び出し側は変更不要。文脈(chatContext)はreducerが保持し、次ターンへ渡す。
  // ══════════════════════════════════════════════════
  const callAgehatoBrain = async (userMsg, context) => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return agehatoBrainLogic(userMsg, context, lang);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const userMsg = chatInput.trim();
    if (!userMsg || isHatoTalking) return;

    dispatch({ type: ACTIONS.SEND_CHAT_START, payload: userMsg });

    try {
      const { text, expression, context } = await callAgehatoBrain(userMsg, chatContext);
      dispatch({ type: ACTIONS.SEND_CHAT_SUCCESS, payload: { text, expression, context } });
    } catch (err) {
      const errorText =
        lang === "ja"
          ? "あれ、うまく答えられなかったっぽ…もう一度聞いてみてほしいっぽ🙏"
          : "Oops, I couldn't come up with an answer-ppo... please try asking again🙏";
      dispatch({ type: ACTIONS.SEND_CHAT_ERROR, payload: { text: errorText } });
    }
  };

  // --- いいね ---
  const handleLikePost = (postId) => dispatch({ type: ACTIONS.TOGGLE_LIKE, payload: postId });

  // --- 投稿確定（checkStatus==="ok" 必須の二重防御つき） ---
  const handlePostSubmit = () => {
    if (!newGiftName || !combinedReview) return;
    if (checkStatus !== "ok") {
      dispatch({ type: ACTIONS.SET_AGEHATO_EXPRESSION, payload: "concerned" });
      return;
    }

    const newPostItem = {
      id: Date.now().toString(),
      userName: t.myName,
      userAvatar: t.myAvatar,
      avatarColor: "#5B9BD5",
      giftEmoji: "🎁",
      giftBg: "linear-gradient(135deg, #eef2f5, #dbe4ec)",
      giftName: newGiftName,
      recipient: selectedRecipient || t.recipients[0],
      scene: selectedScene || t.scenes[0],
      category: newPostCategory,
      rating: 5,
      price: selectedPrice || t.prices[0],
      likes: 0,
      liked: false,
      comments: 0,
      createdAt: t.justNow,
      review: combinedReview,
      lat: demoAsahikawa.lat,
      lng: demoAsahikawa.lng,
      locationName: "現在地付近",
    };

    dispatch({ type: ACTIONS.SUBMIT_POST_SUCCESS, payload: newPostItem });
    dispatch({ type: ACTIONS.AWARD_XP, payload: 20 });
    setTimeout(() => dispatch({ type: ACTIONS.HIDE_XP_ALERT }), 4000);
  };

  // 3欄PostFormへ渡す共通props（投稿画面とモーダルで重複させない）
  const postFormCoreProps = {
    t,
    giftName: newGiftName,
    onChangeGiftName: (v) => dispatch({ type: ACTIONS.SET_POST_FIELD, payload: { field: "giftName", value: v } }),
    category: newPostCategory,
    categories: t.categories.slice(1),
    onChangeCategory: (v) => dispatch({ type: ACTIONS.SET_POST_FIELD, payload: { field: "category", value: v } }),
    reviewReason,
    reviewReaction,
    reviewOther,
    reactionMode,
    onChangeReviewPart: (field, value) => dispatch({ type: ACTIONS.SET_REVIEW_PART, payload: { field, value } }),
    onToggleReactionMode: () => dispatch({ type: ACTIONS.TOGGLE_REACTION_MODE }),
    combinedReview,
    showAiCheck: true,
    hatomono,
    isHatoTalking,
    checkStatus,
    onRunCheck: handleReviewCheck,
    onSubmit: handlePostSubmit,
    canSubmit: !!newGiftName && !!combinedReview && checkStatus === "ok",
  };

  // セッション確認中はアゲハトの待機画面を表示
  if (isCheckingSession) {
    return (
      <div style={{ fontFamily: t.font, background: "#F5F7FA", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <Agehato size={90} expression="thinking" isTalking />
        <p style={{ fontSize: "13px", color: "#718096" }}>{t.chatThinking}</p>
        <style>{`@keyframes sw { 0%,100% { height: 4px; } 50% { height: 14px; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.font, background: "#F5F7FA", minHeight: "100vh", paddingBottom: "70px", color: "#2D2926" }}>
      <Header
        t={t}
        lang={lang}
        onToggleLang={() => dispatch({ type: ACTIONS.SET_LANG, payload: lang === "ja" ? "en" : "ja" })}
        isLoggedIn={isLoggedIn}
        userLv={userLv}
        userXp={userXp}
      />

      {/* XP獲得トースト通知 */}
      {showXpAlert && (
        <div style={{ position: "fixed", top: "70px", right: "20px", background: "#4A7C6F", color: "#fff", padding: "12px 24px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 100, display: "flex", alignItems: "center", gap: "10px" }}>
          <span>🎉</span> <b>{t.xpGained}</b>
        </div>
      )}

      {!isLoggedIn ? (
        <AuthGate
          t={t}
          hatomono={hatomono}
          isHatoTalking={isHatoTalking}
          authStep={authStep}
          loginId={loginId}
          password={password}
          recoveryQ={recoveryQ}
          recoveryA={recoveryA}
          authError={authError}
          isSubmitting={isSubmitting}
          lastAction={lastAction}
          onChangeLoginId={(v) => dispatch({ type: ACTIONS.AUTH_SET_LOGIN_ID, payload: v })}
          onChangePassword={(v) => dispatch({ type: ACTIONS.AUTH_SET_PASSWORD, payload: v })}
          onChangeRecoveryQ={(v) => dispatch({ type: ACTIONS.AUTH_SET_RECOVERY_Q, payload: v })}
          onChangeRecoveryA={(v) => dispatch({ type: ACTIONS.AUTH_SET_RECOVERY_A, payload: v })}
          onLineLogin={handleLineLogin}
          onGotoSignup={() => dispatch({ type: ACTIONS.AUTH_GOTO_STEP, payload: "signup_id" })}
          onGotoLogin={() => dispatch({ type: ACTIONS.AUTH_GOTO_STEP, payload: "login_id" })}
          onSubmit={handleAuthSubmit}
          onFinalizeLogin={finalizeLogin}
        />
      ) : (
        <main
          style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* スワイプ操作ヒント */}
          <p style={{ fontSize: "10px", color: "#A0AEC0", textAlign: "center", margin: "0 0 10px 0" }}>{t.swipeHint}</p>

          {currentNav === "home" && (
            <div style={{ background: "linear-gradient(135deg, #5B9BD5 0%, #3D7CB8 100%)", color: "#fff", padding: "24px", borderRadius: "16px", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.heroTitle}{t.heroSub}</h2>
              <p style={{ fontSize: "13px", opacity: 0.9, margin: "0 0 16px 0" }}>{t.heroDesc}</p>
              <button onClick={() => dispatch({ type: ACTIONS.OPEN_POST_MODAL })} style={{ background: "#FFAB76", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
                {t.postBtn}
              </button>
            </div>
          )}

          {currentNav === "home" && (
            <div>
              <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>{t.nearbyBtn}</span>
                  <button onClick={handleLocate} disabled={isLocating} style={{ background: "#EEF2F6", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", color: "#3D7CB8", fontWeight: "bold" }}>
                    {isLocating ? t.locating : t.locateBtn}
                  </button>
                </div>
                {locationNote && <p style={{ fontSize: "12px", color: "#4A7C6F", margin: "4px 0 0 0" }}>✓ {locationNote}</p>}
                {!userLocation && <p style={{ fontSize: "11px", color: "#718096", margin: "4px 0 0 0" }}>💡 {t.nearbyFallbackNote}</p>}
              </div>

              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "12px" }}>
                {t.categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => dispatch({ type: ACTIONS.SET_CATEGORY_FILTER, payload: cat })}
                    style={{ whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "15px", border: "none", background: selectedCategory === cat ? "#5B9BD5" : "#fff", color: selectedCategory === cat ? "#fff" : "#4A5568", fontSize: "12px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={postSearchQuery}
                onChange={(e) => dispatch({ type: ACTIONS.SET_POST_SEARCH_QUERY, payload: e.target.value })}
                placeholder={t.postSearchPlaceholder}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #CBD5E1", borderRadius: "10px", fontSize: "13px", outline: "none", marginBottom: "12px", boxSizing: "border-box", background: "#fff" }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {(() => {
                  const q = postSearchQuery.trim().toLowerCase();
                  const filteredPosts = posts.filter((p) => {
                    const matchesCategory = selectedCategory === "すべて" || selectedCategory === "All" || p.category === selectedCategory;
                    const matchesQuery = !q || p.giftName.toLowerCase().includes(q) || p.review.toLowerCase().includes(q);
                    return matchesCategory && matchesQuery;
                  });

                  if (filteredPosts.length === 0) {
                    return (
                      <div style={{ textAlign: "center", padding: "32px 16px", color: "#94A3B8" }}>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.noMatchTitle}</p>
                        <p style={{ fontSize: "12px", margin: 0 }}>{t.noMatchDesc}</p>
                      </div>
                    );
                  }

                  return filteredPosts.map((post) => {
                    const origin = userLocation || demoAsahikawa;
                    const distance = calculateDistance(origin.lat, origin.lng, post.lat, post.lng);
                    return <PostCard key={post.id} t={t} post={post} distance={distance} onLike={handleLikePost} />;
                  });
                })()}
              </div>
            </div>
          )}

          {currentNav === "search" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                {/* ヘッダー行：アゲハト＋タイトル */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", borderBottom: "1px dashed #E2E8F0", paddingBottom: "10px" }}>
                  <Agehato size={60} expression={hatomono} isTalking={isHatoTalking} />
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>🐦 アゲハトAIチャット</h3>
                    <p style={{ fontSize: "10px", color: "#94A3B8", margin: 0 }}>
                      {lang === "ja" ? "文脈を覚えて答えるっぽ（直前の地域も引き継ぐっぽ）" : "I remember the context of our chat-ppo"}
                    </p>
                  </div>
                </div>

                {/* ══ チャットログ：高さ450px固定・自動スクロールは一切行わない ══ */}
                <div style={{ height: "450px", overflowY: "auto", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0", padding: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {chatLog.map((m, i) =>
                    m.sender === "user" ? (
                      <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#5B9BD5", color: "#fff", padding: "10px 12px", borderRadius: "14px 14px 4px 14px", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                        {m.text}
                      </div>
                    ) : (
                      <div key={i} style={{ alignSelf: "flex-start", display: "flex", gap: "8px", maxWidth: "88%" }}>
                        <div style={{ flexShrink: 0, marginTop: "2px" }}>
                          <Agehato size={30} expression="idle" />
                        </div>
                        <div style={{ background: "#EEF6FC", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12px", lineHeight: 1.55, whiteSpace: "pre-line", color: "#2D2926" }}>
                          {renderChatText(m.text)}
                        </div>
                      </div>
                    )
                  )}
                  {/* 返信待ちの「考え中」バブル */}
                  {isHatoTalking && (
                    <div style={{ alignSelf: "flex-start", display: "flex", gap: "8px" }}>
                      <div style={{ flexShrink: 0, marginTop: "2px" }}>
                        <Agehato size={30} expression="thinking" />
                      </div>
                      <div style={{ background: "#EEF6FC", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>
                        {t.chatThinking}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {t.quickExamples.map((ex, i) => (
                    <button key={i} onClick={() => dispatch({ type: ACTIONS.SET_CHAT_INPUT, payload: ex })} style={{ background: "#F1F5F9", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", color: "#475569", cursor: "pointer" }}>
                      💡 {ex}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendChat} style={{ display: "flex", gap: "8px" }}>
                  <input type="text" value={chatInput} onChange={(e) => dispatch({ type: ACTIONS.SET_CHAT_INPUT, payload: e.target.value })} placeholder={t.chatPlaceholder} style={{ flex: 1, padding: "10px 14px", border: "1px solid #CBD5E1", borderRadius: "24px", fontSize: "13px", outline: "none" }} />
                  <button type="submit" disabled={isHatoTalking} style={{ background: isHatoTalking ? "#A9C7E6" : "#5B9BD5", color: "#fff", border: "none", padding: "0 16px", borderRadius: "24px", fontWeight: "bold", cursor: isHatoTalking ? "not-allowed" : "pointer", fontSize: "13px" }}>➔</button>
                </form>
              </div>

              <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px" }}>📦 agete スポットおすすめ登録（お土産DB）</h3>

                <input
                  type="text"
                  value={dbSearchQuery}
                  onChange={(e) => dispatch({ type: ACTIONS.SET_DB_SEARCH_QUERY, payload: e.target.value })}
                  placeholder={t.dbSearchPlaceholder}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "12px", outline: "none", marginBottom: "12px", boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(dbSearchQuery.trim() ? matchSouvenirs(dbSearchQuery) : SOUVENIR_DB).length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center", padding: "12px 0" }}>{t.dbSearchNoMatch}</p>
                  ) : (
                    (dbSearchQuery.trim() ? matchSouvenirs(dbSearchQuery) : SOUVENIR_DB).map((s) => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "20px" }}>{s.emoji}</span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "bold" }}>{s.name}</div>
                            <div style={{ fontSize: "11px", color: "#718096" }}>{s.shop} ({s.region})</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "10px", background: "#FFAB76", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>{s.category}</span>
                          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#E8A87C", marginTop: "2px" }}>{s.price}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 投稿画面：3欄フル機能版（シーン・贈り先・価格帯あり） */}
          {currentNav === "post" && (
            <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", border: "1px solid #E2E8F0" }}>
              <PostForm
                {...postFormCoreProps}
                scene={selectedScene}
                scenes={t.scenes}
                onChangeScene={(v) => dispatch({ type: ACTIONS.SET_POST_FIELD, payload: { field: "scene", value: v } })}
                recipient={selectedRecipient}
                recipients={t.recipients}
                onChangeRecipient={(v) => dispatch({ type: ACTIONS.SET_POST_FIELD, payload: { field: "recipient", value: v } })}
                price={selectedPrice}
                prices={t.prices}
                onChangePrice={(v) => dispatch({ type: ACTIONS.SET_POST_FIELD, payload: { field: "price", value: v } })}
              />
            </div>
          )}

          {currentNav === "me" && (
            <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", border: "1px solid #E2E8F0", textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#5B9BD5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", margin: "0 auto 12px auto" }}>
                {t.myAvatar}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 4px 0" }}>{t.myName}</h3>
              <p style={{ fontSize: "12px", color: "#718096", margin: "0 0 16px 0" }}>agete 会員 ID: {loginId || "LINE_USER_4592"}</p>

              <div style={{ background: "#F1F5F9", padding: "16px", borderRadius: "12px", maxWidth: "300px", margin: "0 auto 24px auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                  <span>現在のランク:</span>
                  <span style={{ fontWeight: "bold", color: "#3D7CB8" }}>{t.levelLabel}{userLv} お土産マイスター</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#CBD5E1", borderRadius: "4px", overflow: "hidden", marginBottom: "6px" }}>
                  <div style={{ width: `${userXp}%`, height: "100%", background: "#5B9BD5" }} />
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", textAlign: "right" }}>次のレベルまであと {100 - userXp} {t.xpLabel}</div>
              </div>

              <button
                onClick={handleLogout}
                style={{ background: "none", border: "1px solid #EF4444", color: "#EF4444", padding: "8px 24px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
              >
                {t.authLogout}
              </button>
            </div>
          )}
        </main>
      )}

      {isLoggedIn && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-around", padding: "8px 0", zIndex: 10 }}>
          <button onClick={() => dispatch({ type: ACTIONS.SET_NAV, payload: "home" })} style={{ background: "none", border: "none", flexDirection: "column", alignItems: "center", display: "flex", fontSize: "10px", color: currentNav === "home" ? "#5B9BD5" : "#A0AEC0", cursor: "pointer", fontWeight: "bold" }}>
            <span style={{ fontSize: "18px" }}>🏠</span>{t.navHome}
          </button>
          <button onClick={() => dispatch({ type: ACTIONS.SET_NAV, payload: "search" })} style={{ background: "none", border: "none", flexDirection: "column", alignItems: "center", display: "flex", fontSize: "10px", color: currentNav === "search" ? "#5B9BD5" : "#A0AEC0", cursor: "pointer", fontWeight: "bold" }}>
            <span style={{ fontSize: "18px" }}>🔍</span>{t.navSearch}
          </button>
          <button onClick={() => dispatch({ type: ACTIONS.SET_NAV, payload: "post" })} style={{ background: "none", border: "none", flexDirection: "column", alignItems: "center", display: "flex", fontSize: "10px", color: currentNav === "post" ? "#5B9BD5" : "#A0AEC0", cursor: "pointer", fontWeight: "bold" }}>
            <span style={{ fontSize: "18px" }}>✍️</span>{t.navPost}
          </button>
          <button onClick={() => dispatch({ type: ACTIONS.SET_NAV, payload: "me" })} style={{ background: "none", border: "none", flexDirection: "column", alignItems: "center", display: "flex", fontSize: "10px", color: currentNav === "me" ? "#5B9BD5" : "#A0AEC0", cursor: "pointer", fontWeight: "bold" }}>
            <span style={{ fontSize: "18px" }}>👤</span>{t.navMe}
          </button>
        </nav>
      )}

      {/* クイック投稿モーダル：同じ3欄PostFormを簡易モード（シーン等なし）で再利用 */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => dispatch({ type: ACTIONS.CLOSE_POST_MODAL })} style={{ position: "absolute", top: "12px", right: "16px", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#A0AEC0" }}>✕</button>
            <PostForm {...postFormCoreProps} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes sw {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        @keyframes floatHeart {
          0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-6px) scale(1.15); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
