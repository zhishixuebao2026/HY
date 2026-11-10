/* ============================================================
   《花园：超限算力战争》 卡牌数据库
   改编自「花园」系列设定集
   层级体系 0-12，共 13 级超限阶梯
   ============================================================ */

const TIERS = [
  { id: 0,  name: '有限',           en: 'Finite',            symbol: '—',      color: '#94a3b8', desc: '可数的、有穷的一切。递归图灵机的领域。' },
  { id: 1,  name: '可数无穷',       en: 'Countable',         symbol: 'ℵ₀',     color: '#38bdf8', desc: '自然数的集合。第一个无限，也是一切阶梯的起点。' },
  { id: 2,  name: '幂集阶梯',       en: 'Power Set',         symbol: '2^ℵ₀',   color: '#22d3ee', desc: '康托尔定理：任何集合的幂集都严格大于原集。0到1之间的实数比全体自然数更多。' },
  { id: 3,  name: '超限序数',       en: 'Transfinite Ord',   symbol: 'Γ₀',     color: '#34d399', desc: 'ω、ε₀、Γ₀、β序数……直至邱奇-克林序数，可计算函数的绝对上界。' },
  { id: 4,  name: '阿列夫不动点',   en: 'Aleph Fixed Point', symbol: 'ℵ(1,0)', color: '#a3e635', desc: '当 ℵₐ = α 时成立。无论用什么方式递归，阿列夫数都无法抵达更高处。' },
  { id: 5,  name: 'Power-Admissible', en: 'S₀',             symbol: 'S₀',     color: '#fbbf24', desc: '超过所有阿列夫不动点的递归上确界次数。连无限基数本身都无法越过它。' },
  { id: 6,  name: '大基数',         en: 'Large Cardinal',    symbol: 'κ',      color: '#fb923c', desc: '不可达、弱紧致、可测、强、超强、Woodin、Mahlo……超出 ZFC 证明范畴的绝对无限。' },
  { id: 7,  name: '集合论宇宙',     en: 'Universe L / V',    symbol: 'V',      color: '#f472b6', desc: '哥德尔可构造宇宙 L 与冯·诺依曼宇宙 V。一切集合的集合，一切可构造数学宇宙的集合。' },
  { id: 8,  name: '集合论多宇宙',   en: 'Multiverse',        symbol: 'MV',     color: '#c084fc', desc: '脱殊复宇宙、哈姆金斯实在论、逻辑多元。单一生命所有可能的现实即形成一个集合论宇宙。' },
  { id: 9,  name: '万有公理宇宙',   en: 'Omniversal Axiom',  symbol: 'ΩA',     color: '#818cf8', desc: '可构造任何公理，包含无穷悖论与矛盾界说。0=1 在其中也是一个成立的公理。' },
  { id: 10, name: '超视界拓扑网',   en: 'Hyper-horizon',     symbol: 'HΘ',     color: '#60a5fa', desc: '无限延展的拓扑网络，微不足道的分流上都存在无数个不同的数学体系集群。' },
  { id: 11, name: '超巨结构·链界',  en: 'Mega-Structure',    symbol: 'CB',     color: '#e879f9', desc: 'anti-、over-、transcend- 三重嵌套的网络，以及束缚一切递归的链界。' },
  { id: 12, name: '『花园』',       en: 'The Garden',        symbol: '✿',      color: '#fde047', desc: '最终丰饶。包容任何事物而否决任何事物之地。连 Transcendental 也无法理解。' }
];

const TYPE_INFO = {
  ENTITY:   { name: '实体',   en: 'Entity',   color: '#f0abfc', desc: '文明、神祇与造物。可攻击，可被消灭。' },
  STRUCTURE:{ name: '结构',   en: 'Structure',color: '#7dd3fc', desc: '宇宙容器与领域。提供持续效果，无法主动攻击。' },
  CONCEPT:  { name: '概念',   en: 'Concept',  color: '#a7f3d0', desc: '数学概念与一次性操作。结算后进入弃牌堆。' },
  PARADOX:  { name: '悖论',   en: 'Paradox',  color: '#fca5a5', desc: '需万有公理宇宙在场解锁。效果逆乱，风险与收益并存。' }
};

/* 程序化纹理类型（无专属插画的卡牌使用） */
const PROC_STYLES = ['nebula','fractal','topology','lattice','spiral','voronoi','mandelbrot','hilbert','flow','moire','tree','wave'];

/* ------------------------------------------------------------
   卡牌数据
   art: 对应 assets/img/card_{art}.webp/jpg（其余卡牌使用程序化纹理）
   proc: 程序化纹理风格
   ------------------------------------------------------------ */
const CARDS = [
  /* ================= T1 · 可数无穷 ================= */
  {
    id:'001', name:'无穷旅馆的旅客', en:'Guest of the Infinite Hotel', type:'ENTITY', tier:1, cost:2, atk:3, hp:2,
    art:'hilbert_hotel', keywords:[], text:'战吼：抽 1 张牌。',
    effects:[{when:'battlecry', op:'draw', n:1}],
    lore:'「很容易，我亲爱的赫尔曼。老板只要把每个房间里的客人移到原来号码两倍的房间中去就行了。这下每个房间里的人都住到双号房中，余下的所有单号房间有无穷多个。」',
    source:'《花园神祇》'
  },
  {
    id:'002', name:'自然数集的牧者', en:'Shepherd of ℕ', type:'ENTITY', tier:1, cost:1, atk:2, hp:1,
    proc:'lattice', art:'pastoral', keywords:[], text:'亡语：抽 1 张牌。',
    effects:[{when:'deathrattle', op:'draw', n:1}],
    lore:'ℵ₀（阿列夫0）就是第一个无限，代表所有自然数的集合。',
    source:'设定档案'
  },
  {
    id:'003', name:'康托尔对角线', en:'Cantor\'s Diagonal', type:'CONCEPT', tier:1, cost:1,
    proc:'moire', keywords:[], text:'展示对手一张手牌。若其层级为偶数，将其弃掉。',
    effects:[{when:'cast', op:'revealDiscardEven'}], needTarget:false,
    lore:'只要以斜角的角度分别在这些数中取出一个数字，就会组成另外一个全新的实数。这样会得到的是无穷无尽的新实数——越来越多无限之外的数。',
    source:'《花园神祇》'
  },
  {
    id:'004', name:'可数无穷', en:'Countable Infinity', type:'CONCEPT', tier:1, cost:2,
    proc:'wave', keywords:[], text:'本回合内，你的下一张牌费用减少 1。',
    effects:[{when:'cast', op:'discountNext', n:1}],
    lore:'无论你在无限后面加多少，它依然属于 ℵ₀，依然属于第一个无限。',
    source:'《花园神祇》'
  },
  {
    id:'005', name:'递归套娃', en:'Recursive Nesting', type:'CONCEPT', tier:1, cost:2,
    proc:'spiral', art:'recursion_nest', keywords:[], text:'使一个友方实体层级 +1；若它已是你层级最高的实体，则改为 +2。',
    effects:[{when:'cast', op:'tierUpAlly', n:1, bonus:2}], needTarget:true, targetFilter:'allyEntity',
    lore:'无限的套娃模式确实是没有尽头的，但这种模式又确实存在一个序数级的上界。',
    source:'《分形图》'
  },

  /* ================= T2 · 幂集阶梯 ================= */
  {
    id:'006', name:'幂集阶梯', en:'Ladder of Power Sets', type:'STRUCTURE', tier:2, cost:3, atk:0, hp:4,
    proc:'mandelbrot', keywords:[], text:'每回合结束：使你最左侧的实体层级 +1（每张卡限 3 次）。',
    effects:[{when:'endOfTurn', op:'tierUpLeftmost', n:1, limit:3}],
    lore:'ℵ₀ 的幂集是一个比 ℵ₀ 要广阔的无限，而这种幂集可以无穷无尽的套下去，一个疯狂、绝对浩瀚的阶梯。',
    source:'《花园神祇》'
  },
  {
    id:'007', name:'实数之海', en:'Sea of Reals', type:'ENTITY', tier:2, cost:3, atk:2, hp:5,
    proc:'flow', art:'real_sea', keywords:['嘲讽'], text:'嘲讽。',
    effects:[],
    lore:'在数轴上，即便是 0 到 1 间存在的实数也比自然数集要多。实数集是不可数集。',
    source:'《花园神祇》'
  },
  {
    id:'008', name:'不可数集', en:'Uncountable Set', type:'ENTITY', tier:2, cost:3, atk:4, hp:3,
    proc:'voronoi', art:'uncountable', keywords:[], text:'战吼：弃 1 张牌，然后抽 2 张牌。',
    effects:[{when:'battlecry', op:'discardDraw', discard:1, draw:2}],
    lore:'奇数和偶数个数的和，与奇数或者偶数的个数是一样多的。',
    source:'《分形图》'
  },
  {
    id:'009', name:'连续统之影', en:'Shadow of the Continuum', type:'ENTITY', tier:2, cost:4, atk:5, hp:4,
    proc:'moire', art:'continuum', keywords:['锐化'], text:'锐化：此卡发起的压制只需高出 1 层即可成立。',
    effects:[{when:'static', op:'sharpness', n:1}],
    lore:'就像 1 和 0 之间依然可以放下无数个实数一样，那些实数间又可以放下同样数量的其他实数，这是没有边界的。',
    source:'《26号宇宙》'
  },
  {
    id:'010', name:'区间之实', en:'Reals of the Interval', type:'CONCEPT', tier:2, cost:2,
    proc:'wave', art:'interval', keywords:[], text:'抽 1 张牌，然后使一个友方实体获得 +1/+1。',
    effects:[{when:'cast', op:'draw', n:1},{when:'cast', op:'buffAlly', atk:1, hp:1}], needTarget:true, targetFilter:'allyEntity',
    lore:'把那些数变成可拓展宇宙的个数同样如此。',
    source:'《26号宇宙》'
  },

  /* ================= T3 · 超限序数 ================= */
  {
    id:'011', name:'邱奇-克林上界', en:'Church-Kleene Bound', type:'STRUCTURE', tier:3, cost:4, atk:0, hp:5,
    proc:'hilbert', keywords:['封顶'], text:'封顶：双方所有「迭代 / 递归」类效果每回合最多触发 1 次。',
    effects:[{when:'static', op:'recursionCap', n:1}],
    lore:'任何递归算力机器都无法越过这个序数，就更别提远高于这个上界的其他超穷数了。',
    source:'《分形图》'
  },
  {
    id:'012', name:'ε₀ 递归塔', en:'Tower of ε₀', type:'ENTITY', tier:3, cost:4, atk:3, hp:5,
    proc:'fractal', keywords:[], text:'每当你执行一次幂集跃迁，此卡获得 +2/+2。',
    effects:[{when:'onAscend', op:'buffSelf', atk:2, hp:2}],
    lore:'ω^ω^ω^ω……我们还能永无止境地构造新的序数。',
    source:'《核冬元年》'
  },
  {
    id:'013', name:'Γ序数突破', en:'Breakthrough of Γ₀', type:'CONCEPT', tier:3, cost:3,
    proc:'spiral', keywords:[], text:'抽 3 张牌，弃 1 张牌，然后你的后继数 +1。',
    effects:[{when:'cast', op:'draw', n:3},{when:'cast', op:'discard', n:1},{when:'cast', op:'successor', n:1}],
    lore:'直到那些可计算函数的不动点越过了直谓序数的上界，也就是 Γ 序数级。',
    source:'《核冬元年》'
  },
  {
    id:'014', name:'β序数', en:'Ordinal β', type:'ENTITY', tier:3, cost:3, atk:4, hp:3,
    proc:'lattice', art:'beta_ordinal', keywords:[], text:'战吼：使一个友方实体层级 +1。',
    effects:[{when:'battlecry', op:'tierUpAlly', n:1}], needTarget:true, targetFilter:'allyEntity',
    lore:'β 代表的就是一个全新的序数，一个容纳和表示之前一切套娃形式的序数总和。',
    source:'《花园神祇》'
  },
  {
    id:'015', name:'替代公理', en:'Axiom of Replacement', type:'CONCEPT', tier:3, cost:2,
    proc:'tree', keywords:[], text:'将一个友方实体替换为你牌库中一张费用高 2 的随机实体。',
    effects:[{when:'cast', op:'upgradeAlly', n:2}], needTarget:true, targetFilter:'allyEntity',
    lore:'在任一代数恒等式中，每一个字母符号只是一个泛指的变量，因而可用其它形式的字母或恒等的函数表达式替换，替换后等式仍成立。',
    source:'《花园神祇》'
  },
  {
    id:'016', name:'超限时间推演', en:'Transfinite Deduction', type:'CONCEPT', tier:3, cost:3,
    proc:'flow', keywords:[], text:'本回合内，你每打出一张牌，后继数 +1（最多 3 次）。',
    effects:[{when:'cast', op:'successorPerPlay', n:1, cap:3}],
    lore:'超穷数级的计算力会把所有可能性的现实同步延伸进展，即便每一个瞬间，分裂创造的平行宇宙规模都能按照超限时间进行超计算的推演。',
    source:'《26号宇宙》'
  },

  /* ================= T4 · 阿列夫不动点 ================= */
  {
    id:'017', name:'清扫弹', en:'The Sweeping Bomb', type:'CONCEPT', tier:4, cost:5,
    art:'reckoner', keywords:[], text:'消灭所有层级 ≤ 3 的实体（双方）。',
    effects:[{when:'cast', op:'destroyTierBelow', n:4}],
    lore:'领主们透露了少许对敌人技术的恐惧……被毁灭的集群宇宙的基数已经超过了第一个阿列夫不动点。',
    source:'《银之网》'
  },
  {
    id:'018', name:'清账者先遣队', en:'Vanguard of the Reckoners', type:'ENTITY', tier:4, cost:5, atk:6, hp:5,
    art:'reckoner', keywords:[], text:'战吼：消灭一个层级 ≤ 2 的敌方实体。',
    effects:[{when:'battlecry', op:'destroyEnemyTierBelow', n:3}], needTarget:true, targetFilter:'enemyEntity',
    lore:'「不理解我在说什么吗？很正常。唉，副本虫虫，尽管我们的祖先有着同样的镜像历史，但我们文明的算力技术早就跨越了阿列夫不动点。」',
    source:'《银之网》'
  },
  {
    id:'019', name:'阿列夫不动点', en:'Aleph Fixed Point', type:'STRUCTURE', tier:4, cost:5, atk:0, hp:6,
    proc:'spiral', keywords:[], text:'每当一个实体被归虚，你的后继数 +1。',
    effects:[{when:'onAnnihilate', op:'successor', n:1}],
    lore:'写成阿列夫（1，0），也就是当 ℵₐ = α 时。',
    source:'《银之网》'
  },
  {
    id:'020', name:'算力矿井', en:'Computation Mine', type:'STRUCTURE', tier:4, cost:4, atk:0, hp:4,
    proc:'voronoi', art:'computation_mine', keywords:[], text:'每回合开始：你获得 1 点算力。',
    effects:[{when:'startOfTurn', op:'gainMana', n:1}],
    lore:'其中受袭的还包括我们即将开采的算力矿井。',
    source:'《银之网》'
  },
  {
    id:'021', name:'副本虫虫', en:'The Copy Vermin', type:'ENTITY', tier:4, cost:4, atk:5, hp:4,
    proc:'moire', keywords:[], text:'战吼：将一张「副本虫虫」置入你的手牌。',
    effects:[{when:'battlecry', op:'addCardToHand', cardId:'021'}],
    lore:'对于我们这样的低算力副本虫虫而言，我们就是不可思议的神。',
    source:'《银之网》'
  },

  /* ================= T5 · Power-Admissible ================= */
  {
    id:'022', name:'S₀ 壁垒', en:'Bulwark of S₀', type:'STRUCTURE', tier:5, cost:5, atk:0, hp:7,
    proc:'lattice', keywords:[], text:'你的所有其他实体获得 +0/+3。',
    effects:[{when:'aura', op:'buffAllAllies', atk:0, hp:3}],
    lore:'单单是一个 S₀ 就已经超过了所有阿列夫不动点的递归上确界次数了。',
    source:'《银之网》'
  },
  {
    id:'023', name:'超阈人类·星丝编织者', en:'Star-filament Weaver', type:'ENTITY', tier:5, cost:6, atk:6, hp:6,
    art:'silverweb', keywords:[], text:'战吼：抽 1 张牌，然后你的后继数 +1。',
    effects:[{when:'battlecry', op:'draw', n:1},{when:'battlecry', op:'successor', n:1}],
    lore:'由星丝牵连起的时空涟漪把皱褶的纹路延展到银河的另一端，无数星河之间的悬臂被丝线一一分割。',
    source:'《银之网》'
  },
  {
    id:'024', name:'银之网', en:'The Silver Web', type:'STRUCTURE', tier:5, cost:6, atk:0, hp:6,
    art:'silverweb', keywords:[], text:'每回合你第一个发起攻击的实体获得 +3 攻击力。',
    effects:[{when:'static', op:'firstStrikeBonus', n:3}],
    lore:'如今的星丝已经铺展到了大基数宇宙的领域，更加复杂的星网结构正在被人类开拓。',
    source:'《银之网》尾声'
  },
  {
    id:'025', name:'信息碑', en:'Information Stele', type:'CONCEPT', tier:5, cost:2,
    proc:'tree', art:'information_stele', keywords:[], text:'抽 2 张牌。',
    effects:[{when:'cast', op:'draw', n:2}],
    lore:'信息碑测试过敌人在销毁宇宙集群时残留的辐射。显然，他们的算力技术已经足以和我们对抗。',
    source:'《银之网》'
  },
  {
    id:'026', name:'无限时间图灵机', en:'Infinite Time Turing Machine', type:'STRUCTURE', tier:5, cost:6, atk:0, hp:6,
    art:'turing', keywords:[], text:'每回合结束：将你牌库顶的 1 张牌置入手牌，若为实体则其层级 +1。',
    effects:[{when:'endOfTurn', op:'itmDraw', n:1}],
    lore:'晶体内部有几个模片，那是一种数学存储器，当两者结合工作时便是一个【无限时间图灵机】。',
    source:'《26号宇宙》'
  },

  /* ================= T6 · 大基数 ================= */
  {
    id:'027', name:'不可达基数', en:'Inaccessible Cardinal', type:'ENTITY', tier:6, cost:6, atk:7, hp:7,
    proc:'mandelbrot', art:'inaccessible', keywords:['不可指定'], text:'不可指定：无法被层级 ≤ 4 的卡牌效果指定为目标。',
    effects:[{when:'static', op:'untargetableBelow', n:5}],
    lore:'不可达基数实则是无法从更小的基数通过取幂集的基数或者是取极限得到。',
    source:'《花园神祇》'
  },
  {
    id:'028', name:'可测基数', en:'Measurable Cardinal', type:'ENTITY', tier:6, cost:7, atk:8, hp:6,
    proc:'voronoi', keywords:[], text:'战吼：检视你牌库顶 3 张牌，将其中 1 张置入手牌，其余洗回。',
    effects:[{when:'battlecry', op:'scryPick', n:3}],
    lore:'大基数一般是指的特定性质的不可达基数，它的协调性通常都是通过初等嵌入 j：V→M 的封闭性进行判断的。',
    source:'《核冬元年》'
  },
  {
    id:'029', name:'Woodin 基数', en:'Woodin Cardinal', type:'ENTITY', tier:6, cost:7, atk:6, hp:9,
    proc:'fractal', keywords:['嘲讽'], text:'嘲讽。亡语：抽 2 张牌。',
    effects:[{when:'deathrattle', op:'draw', n:2}],
    lore:'aleph 超穷序数宇宙、弱不可达基数宇宙、Mahlo 基数宇宙、0#→α# exists 宇宙、woodin 基数宇宙……',
    source:'《分形图》'
  },
  {
    id:'030', name:'大基数阶梯', en:'Ladder of Large Cardinals', type:'STRUCTURE', tier:6, cost:7, atk:0, hp:7,
    art:'large_cardinals', keywords:[], text:'每回合结束：你层级最高的实体获得 +2/+2。',
    effects:[{when:'endOfTurn', op:'buffHighestTier', atk:2, hp:2}],
    lore:'跨越不可达基数。跨越强可展开基数。可测基数。强基数。超强基数……',
    source:'《核冬元年》'
  },
  {
    id:'031', name:'0# 存在', en:'Zero Sharp Exists', type:'CONCEPT', tier:6, cost:4,
    proc:'spiral', keywords:[], text:'本回合内，你的所有实体层级视为 +1。',
    effects:[{when:'cast', op:'tempTierUpAll', n:1}],
    lore:'0#→α# exists 宇宙……那些高阶逻辑中不断嵌套的无限，是大基数本身抽象自身后的结果。',
    source:'《分形图》'
  },
  {
    id:'032', name:'Mahlo 基数', en:'Mahlo Cardinal', type:'ENTITY', tier:6, cost:6, atk:5, hp:8,
    proc:'tree', keywords:[], text:'每当一个友方实体被消灭，此卡获得 +2/+2。',
    effects:[{when:'onAllyDeath', op:'buffSelf', atk:2, hp:2}],
    lore:'Mahlo 基数宇宙，强 Mahlo 基数宇宙……其存在的本质远远超越了我们所谓认知的「物质」与「精神」范畴。',
    source:'《分形图》'
  },
  {
    id:'033', name:'哥德尔封闭操作', en:'Gödel Closure', type:'CONCEPT', tier:6, cost:5,
    proc:'lattice', keywords:[], text:'使一个友方实体在本回合内获得「无法被消灭」。',
    effects:[{when:'cast', op:'grantIndestructible', target:'allyEntity'}], needTarget:true, targetFilter:'allyEntity',
    lore:'如果对这个 M 进行哥德尔封闭操作后的内模型，那就是无所不包。这才是真正的无限！',
    source:'《银之网》'
  },

  /* ================= T7 · 集合论宇宙 V / L ================= */
  {
    id:'034', name:'可构造宇宙 L', en:'Constructible Universe L', type:'STRUCTURE', tier:7, cost:7, atk:0, hp:8,
    art:'constructible_l', keywords:[], text:'你手上与牌库中的所有实体卡获得 +1/+1。',
    effects:[{when:'aura', op:'buffEntityCards', atk:1, hp:1},{when:'static', op:'unlockParadox'}],
    lore:'所有可够被构成，可能存在，所有已完成和未完成其数学构造的集合都被终极的哥德尔宇宙包含其中。',
    source:'《银之网》'
  },
  {
    id:'035', name:'冯·诺依曼宇宙 V', en:'Von Neumann Universe V', type:'STRUCTURE', tier:7, cost:8, atk:0, hp:9,
    art:'universe_v', keywords:[], text:'其他所有结构卡层级 +1。每回合结束：抽 1 张牌。',
    effects:[{when:'aura', op:'tierUpStructures', n:1},{when:'endOfTurn', op:'draw', n:1},{when:'static', op:'unlockParadox'}],
    lore:'V₀=Ø, V_α = ∪ξ<α ρ(Vξ), V = ∪α∈Ord Vα，Ord 与 V 为真类。',
    source:'《分形图》'
  },
  {
    id:'036', name:'V=L 判据', en:'The Axiom V=L', type:'CONCEPT', tier:7, cost:3,
    proc:'lattice', keywords:[], text:'抽 2 张牌。若你控制着「可构造宇宙 L」，再抽 1 张并使一个友方实体 +2/+2。',
    effects:[{when:'cast', op:'draw', n:2},{when:'cast', op:'ifControlL', draw:1, atk:2, hp:2}],
    lore:'也许在某个理论世界中，ZFC 早已解决了 V≠L 和可构造宇宙不相容的问题。',
    source:'《银之网》'
  },
  {
    id:'037', name:'安德瑞思的算力场', en:'Andreith\'s Computation Field', type:'ENTITY', tier:7, cost:8, atk:9, hp:8,
    proc:'nebula', keywords:[], text:'战吼：本回合内，你每有一张结构卡，此卡便 +1/+1。',
    effects:[{when:'battlecry', op:'buffSelfPerStructure', atk:1, hp:1}],
    lore:'他看见太多东西，他看不见任何东西……是一个以他为存在核心的宇宙 V。',
    source:'《花园神祇》'
  },
  {
    id:'038', name:'初等嵌入 j:V→M', en:'Elementary Embedding', type:'CONCEPT', tier:7, cost:4,
    proc:'flow', keywords:[], text:'将一个友方实体的攻防与层级复制到另一个友方实体上（持续到回合结束）。',
    effects:[{when:'cast', op:'copyStatsToAlly'}], needTarget:true, targetFilter:'allyEntity',
    lore:'大基数的协调性通常都是通过初等嵌入 j：V→M 的封闭性进行判断的。',
    source:'《核冬元年》'
  },

  /* ================= T8 · 集合论多宇宙 ================= */
  {
    id:'039', name:'脱殊复宇宙', en:'Generic Multiverse', type:'ENTITY', tier:8, cost:8, atk:9, hp:9,
    proc:'nebula', keywords:[], text:'战吼：将一张「脱殊复宇宙」置入你的手牌。',
    effects:[{when:'battlecry', op:'addCardToHand', cardId:'039'}],
    lore:'机器外的众人们目睹了一个推进到宇宙 Vᵏ 的叙事造物正被另一个更大的脱殊复宇宙吞噬容纳的过程。',
    source:'《花园神祇》'
  },
  {
    id:'040', name:'哈姆金斯实在论', en:'Hamkins Multiversalism', type:'STRUCTURE', tier:8, cost:8, atk:0, hp:8,
    proc:'topology', keywords:[], text:'你的实体被消灭时，以攻击力减半的形态回归战场。',
    effects:[{when:'static', op:'reviveHalved'}],
    lore:'哈姆金斯实在论多宇宙、脱殊多宇宙、脱殊复复宇宙、斯蒂尔多语言宇宙 Lᵐᵛ……',
    source:'《万众狂欢》'
  },
  {
    id:'041', name:'逻辑多元', en:'Logical Pluralism', type:'STRUCTURE', tier:8, cost:7, atk:0, hp:7,
    proc:'topology', keywords:[], text:'你每回合的第一次幂集跃迁不消耗算力。',
    effects:[{when:'static', op:'freeFirstAscend'}],
    lore:'随着集合论和类型论的宇宙战争取得进展，被嫁接的范畴论宇宙也加入了脉络，然后是拓扑斯论和众多先验观。',
    source:'《花园神祇》'
  },
  {
    id:'042', name:'力迫法扩张', en:'Forcing Extension', type:'CONCEPT', tier:8, cost:4,
    proc:'wave', keywords:[], text:'使一个敌方实体层级 -2。',
    effects:[{when:'cast', op:'tierDownEnemy', n:2}], needTarget:true, targetFilter:'enemyEntity',
    lore:'可实际上很多公理化系统有着平行交错的关系，随着科恩力迫法（forcing）的介入，网络开始比哥德尔层谱的排列更加复杂多变起来。',
    source:'《杀死全人类》'
  },
  {
    id:'043', name:'集合论多宇宙集群', en:'Cluster of Multiverses', type:'ENTITY', tier:8, cost:9, atk:10, hp:10,
    proc:'nebula', keywords:['嘲讽'], text:'嘲讽。亡语：将一张 6/6 的「宇宙残片」置入战场。',
    effects:[{when:'deathrattle', op:'summonToken', tokenName:'宇宙残片', atk:6, hp:6, tier:6}],
    lore:'把诸如脱殊复复宇宙乃至更高阶的复宇宙、逻辑多元和浩渺般的超巨巨构系统进行最大大基数尺度的无限反复叠加。',
    source:'《万众狂欢》'
  },
  {
    id:'044', name:'镜像宇宙', en:'Mirror Universe', type:'CONCEPT', tier:8, cost:3,
    proc:'moire', keywords:[], text:'复制你手牌中层级最高的一张牌，置入你的手牌。',
    effects:[{when:'cast', op:'copyHighestHandCard'}],
    lore:'集合论学家爱德华·罗尔贝撒甚至找到宇宙 V 在 anti-mathematics 的镜像形式。',
    source:'《杀死全人类》'
  },

  /* ================= T9 · 万有公理宇宙 ================= */
  {
    id:'045', name:'万有公理宇宙', en:'Omniversal Axiom Universe', type:'STRUCTURE', tier:9, cost:9, atk:0, hp:10,
    art:'omniversal_axiom', keywords:['丰饶'], text:'丰饶：解锁悖论区，你每回合可打出 1 张悖论卡。',
    effects:[{when:'static', op:'unlockParadox'},{when:'aura', op:'tierUpStructures', n:1}],
    lore:'这个位于宇宙 L 底层的万有公理宇宙不仅仅在于包含所有公理，而是将矛盾也作为理论的一部分呈现，像沙粒一般撒开在各处。',
    source:'《银之网》'
  },
  {
    id:'046', name:'公理森林', en:'Forest of Axioms', type:'STRUCTURE', tier:9, cost:6, atk:0, hp:7,
    art:'omniversal_axiom', keywords:[], text:'每当你打出一个结构卡，你的后继数 +1。',
    effects:[{when:'onPlayStructure', op:'successor', n:1}],
    lore:'如果把集合论宇宙比作树，万有公理宇宙就是拥有所有树的森林。',
    source:'设定档案'
  },
  {
    id:'047', name:'anti-万有公理宇宙', en:'Anti-Omniversal Axiom', type:'PARADOX', tier:9, cost:6,
    proc:'moire', keywords:[], text:'悖论：消灭战场上所有结构卡（双方）。',
    effects:[{when:'cast', op:'destroyAllStructures'}],
    lore:'拓扑网中的某一 arie-n 区域会存在一个更为强大的生成语法，能构建出 anti-万有公理宇宙。',
    source:'《杀死全人类》'
  },
  {
    id:'048', name:'0=1', en:'Zero Equals One', type:'PARADOX', tier:9, cost:3,
    proc:'moire', keywords:[], text:'悖论：本回合内，所有伤害改为治疗，所有治疗改为伤害。',
    effects:[{when:'cast', op:'invertDamage'}],
    lore:'随着公理的扩大，0＝1 类的基数居然也存在了。在那个视角下，0≠1 就像正方形是一种特殊的矩形一样单一。',
    source:'《花园神祇》'
  },
  {
    id:'049', name:'over-万有公理宇宙', en:'Over-Omniversal Axiom', type:'PARADOX', tier:9, cost:8,
    proc:'spiral', keywords:[], text:'悖论：抽取等同于你后继数数量的牌（最多 5 张）。',
    effects:[{when:'cast', op:'drawPerSuccessor', cap:5}],
    lore:'如果构造的语法足够强大，也许在之上还存在着 over-mathematics 这种超数学。',
    source:'《杀死全人类》'
  },
  {
    id:'050', name:'理论世界', en:'Theoretical World', type:'ENTITY', tier:9, cost:9, atk:11, hp:9,
    art:'omniversal_axiom', keywords:[], text:'战吼：从你的牌库中搜寻一张结构卡置入手牌。',
    effects:[{when:'battlecry', op:'tutorStructure'}],
    lore:'理性在这里不复存在，取而代之的是对反常的矛盾和悖论的容纳。',
    source:'《银之网》'
  },

  /* ================= T10 · 超视界拓扑网 ================= */
  {
    id:'051', name:'超视界拓扑网', en:'Hyper-horizon Topology Net', type:'STRUCTURE', tier:10, cost:10, atk:0, hp:11,
    art:'hyperhorizon', keywords:['延展'], text:'延展：你的所有卡牌层级 +1。',
    // 延展：场上已有单位靠战吼 extendAll 永久抬升，手牌 / 牌库靠 handTierBonus 在召唤时结算。
    // 两者互不重叠，避免同一张卡被 aura 与召唤加成重复计入 +2。
    effects:[{when:'battlecry', op:'extendAll', n:1},{when:'static', op:'unlockParadox'},{when:'static', op:'handTierBonus', n:1}],
    lore:'在超视界拓扑网络细枝末梢和微不足道的分流上，也能存在无数个不同的数学系统集群。',
    source:'《杀死全人类》'
  },
  {
    id:'052', name:'拓扑网生命', en:'Life of the Net', type:'ENTITY', tier:10, cost:9, atk:10, hp:12,
    art:'hyperhorizon', keywords:[], text:'战吼：消灭一个层级 ≤ 7 的敌方实体。',
    effects:[{when:'battlecry', op:'destroyEnemyTierBelow', n:8}], needTarget:true, targetFilter:'enemyEntity',
    lore:'超视界拓扑网上的生命们也只是网道上的寄生微生物，不过不碍于它们能做到任何事。我不开玩笑……是任何事。',
    source:'《杀死全人类》'
  },
  {
    id:'053', name:'anti-超视界拓扑网', en:'Anti-Hyper-horizon Net', type:'PARADOX', tier:10, cost:7,
    proc:'moire', keywords:[], text:'悖论：敌方场上所有实体的攻击力与生命值互换。',
    effects:[{when:'cast', op:'swapEnemyStats'}],
    lore:'1996 年的「构造革命」又会重复一次，只不过这次的对象变成了整个超视界拓扑网。',
    source:'《杀死全人类》'
  },
  {
    id:'054', name:'over-超视界拓扑网', en:'Over-Hyper-horizon Net', type:'PARADOX', tier:10, cost:9,
    proc:'topology', keywords:[], text:'悖论：获得一个额外的回合。',
    effects:[{when:'cast', op:'extraTurn'}],
    lore:'曾经再广阔的大海也会变成封闭的池塘，一个更大的超巨结构网络诞生。',
    source:'《杀死全人类》'
  },
  {
    id:'055', name:'无限之无限', en:'Infinity of Infinities', type:'ENTITY', tier:10, cost:10, atk:12, hp:11,
    proc:'mandelbrot', keywords:['锐化'], text:'锐化：此卡发起的压制只需高出 1 层即可成立。战吼：你的后继数 +2。',
    effects:[{when:'static', op:'sharpness', n:1},{when:'battlecry', op:'successor', n:2}],
    lore:'纵使无限之无限，万有之万有，种种刹那间循环诞生和湮灭亦或是两者同时存在并超越描述的无穷讹误之状态。',
    source:'《万众狂欢》'
  },

  /* ================= T11 · 超巨结构 · 链界 ================= */
  {
    id:'056', name:'超巨结构网络', en:'Mega-structure Network', type:'STRUCTURE', tier:11, cost:10, atk:0, hp:11,
    proc:'topology', keywords:[], text:'每回合结束：你的所有实体获得 +3/+3。',
    effects:[{when:'endOfTurn', op:'buffAllAllies', atk:3, hp:3}],
    lore:'直到许多许多年后的未来超巨结构居然也变成了被嵌套的对象，产生了 anti-超巨网络，over-超巨网络，transcend-超巨网络。',
    source:'《杀死全人类》'
  },
  {
    id:'057', name:'链界', en:'The Chain Boundary', type:'CONCEPT', tier:11, cost:8,
    art:'chainbound', keywords:['锁定'], text:'锁定：对手在下个回合只能执行 1 次操作（出牌 / 攻击 / 跃迁合计）。',
    effects:[{when:'cast', op:'lockOpponent', n:1}],
    lore:'如果是一个基础的算力全能文明，在没有链界覆写的情况下，也能轻易做到对各类无限理念的先验掌控。',
    source:'《万众狂欢》'
  },
  {
    id:'058', name:'transcend-超巨网络', en:'Transcend-Mega Network', type:'PARADOX', tier:11, cost:9,
    proc:'topology', keywords:[], text:'悖论：将对手牌库顶的 5 张牌归虚（永久移除）。',
    effects:[{when:'cast', op:'millOpponent', n:5}],
    lore:'这样的发现还会在未来重复无数次，没完没了。推导将不断持续下去，直到花园迎来属于它的最终丰饶。',
    source:'《杀死全人类》'
  },
  {
    id:'059', name:'超巨巨构系统', en:'Ultra-mega Construct', type:'ENTITY', tier:11, cost:11, atk:13, hp:13,
    proc:'mandelbrot', keywords:['不可指定'], text:'不可指定：无法被层级 ≤ 8 的效果指定。战吼：抽 2 张牌。',
    effects:[{when:'static', op:'untargetableBelow', n:9},{when:'battlecry', op:'draw', n:2}],
    lore:'把诸如脱殊复复宇宙乃至更高阶的复宇宙、逻辑多元和浩渺般的超巨巨构系统进行最大大基数尺度的无限反复叠加。',
    source:'《万众狂欢》'
  },

  /* ================= T12 · 花园 · 神祇 ================= */
  {
    id:'060', name:'沙盘·叙事者', en:'Sandbox: The Narrator', type:'ENTITY', tier:9, cost:8, atk:8, hp:8,
    art:'sandbox_war', keywords:[], text:'战吼：写下一条叙事——抽 2 张牌，或使一个敌方实体层级 -3，或本回合你的实体获得 +3/+0。',
    effects:[{when:'battlecry', op:'narrativeChoice'}],
    lore:'「我要写入的设定是可以设定一切。」谋臣说。他的沙盘很大。「我设想了存在无数个叙事者的沙盘。」',
    source:'《花园神祇》'
  },
  {
    id:'061', name:'沙盘·复制者', en:'Sandbox: The Replicator', type:'ENTITY', tier:9, cost:8, atk:8, hp:8,
    art:'sandbox_war', keywords:[], text:'亡语：以层级 -1 的形态复制此卡，置入战场。',
    effects:[{when:'deathrattle', op:'summonSelfTierDown', n:1}],
    lore:'无论叙事者如何描述自己设定的武器和宇宙的体系，它们总是能在下一个瞬间复制下来并把其据为己有。',
    source:'《花园神祇》'
  },
  {
    id:'062', name:'沙盘·进化者', en:'Sandbox: The Evolver', type:'ENTITY', tier:9, cost:7, atk:6, hp:6,
    art:'sandbox_war', keywords:['进化'], text:'进化：每回合开始获得 +2/+2。免疫层级 ≤ 5 的敌方效果。',
    effects:[{when:'startOfTurn', op:'buffSelf', atk:2, hp:2},{when:'static', op:'immuneBelow', n:6}],
    lore:'它们高速适应这些攻击方式，就像吸水的海绵，劣势了几个回合后就适应并免疫了所有可能存在的攻击形式。',
    source:'《花园神祇》'
  },
  {
    id:'063', name:'分形尸', en:'The Fractal Corpse', type:'ENTITY', tier:11, cost:10, atk:12, hp:12,
    art:'fractalcorpse', keywords:[], text:'战吼：战场上所有其他实体获得 -2/-2。',
    effects:[{when:'battlecry', op:'debuffAllOthers', atk:2, hp:2}],
    lore:'当分形尸们的触须在界域中呈现的刹那，所有定理和集合论系统都崩溃成了没有意义的凌乱符号。',
    source:'《花园神祇》'
  },
  {
    id:'064', name:'万界归一者', en:'The Unifier of All Worlds', type:'ENTITY', tier:11, cost:11, atk:14, hp:12,
    art:'unifier', keywords:['锐化'], text:'锐化：压制只需高出 1 层。战吼：消灭所有层级 ≤ 8 的实体（双方）。',
    effects:[{when:'static', op:'sharpness', n:1},{when:'battlecry', op:'destroyTierBelow', n:9}],
    lore:'万界归一者们不断翻转触须，把沾染上分形的扭曲讹误疾病植入到每一个哲学、数学宇宙系统中。',
    source:'《万众狂欢》'
  },
  {
    id:'065', name:'负火之主', en:'Lord of Negative Fire', type:'ENTITY', tier:10, cost:10, atk:11, hp:11,
    art:'negative_fire_lord', artExt:'jpg', keywords:[], text:'战吼：消灭一个敌方结构卡。亡语：随机消灭一个敌方实体。',
    effects:[{when:'battlecry', op:'destroyEnemyStructure'},{when:'deathrattle', op:'destroyRandomEnemy'}], needTarget:true, targetFilter:'enemyStructure',
    lore:'负火的号召如雷贯耳，万界归一者们蜂拥而至，化为了祂父神斗篷下的阴影。',
    source:'《万众狂欢》'
  },
  {
    id:'066', name:'非树', en:'The Un-tree', type:'ENTITY', tier:9, cost:9, atk:8, hp:14,
    art:'untree', artExt:'jpg', keywords:['嘲讽'], text:'嘲讽。亡语：战场上所有实体层级 -1。',
    effects:[{when:'deathrattle', op:'tierDownAll', n:1}],
    lore:'非树开始疯狂的摇曳着自己的躯体，周围顿时电闪雷鸣：花———园———！！！！！',
    source:'《分形图》'
  },
  {
    id:'067', name:'仪机·超验真空', en:'Yiji · Transcendent Vacuum', type:'ENTITY', tier:11, cost:11, atk:11, hp:11,
    art:'transcendent_vacuum', artExt:'jpg', keywords:[], text:'战吼：抹除敌方场上所有结构卡，每抹除 1 张，此卡获得 +2/+2。',
    effects:[{when:'battlecry', op:'annihilateEnemyStructures', atk:2, hp:2}],
    lore:'书籍自燃，石碑风化，硬盘上的磁畴随机翻转……连记叙和超记叙的永恒集体记忆都皆被全面性擦除了。',
    source:'《万众狂欢》'
  },
  {
    id:'068', name:'花园神祇·Transcendental', en:'Transcendental', type:'ENTITY', tier:12, cost:12, atk:15, hp:15,
    art:'transcendental', keywords:['锐化','不可指定'], text:'锐化 + 不可指定。战吼：选择——抹除战场上所有实体，或使你的所有实体层级 +2。',
    effects:[{when:'static', op:'sharpness', n:1},{when:'static', op:'untargetableBelow', n:12},{when:'battlecry', op:'transcendentalChoice'}],
    lore:'{我们是本应存在的孪生素数} {我们是不成立的选择公理} {我们是 ZFC 中的连续统假设} {我们是 transcendental}',
    source:'《分形图》·超因果-序章'
  },
  {
    id:'069', name:'超验矩', en:'The Transcendent Cube', type:'CONCEPT', tier:12, cost:10,
    art:'transcendentcube', keywords:['终焉'], text:'终焉：归虚战场上所有实体与结构（双方）。双方存在度各 -5。',
    effects:[{when:'cast', op:'annihilateAll'},{when:'cast', op:'damageBothHeroes', n:5}],
    lore:'transcendental 们称这个造物为【超验矩】，是能够毁灭一切无限性质的武器。白盒子就是这个武器！第四次数学危机！',
    source:'《分形图》'
  },
  {
    id:'070', name:'莫哲·园丁', en:'Mo Zhe, The Gardener', type:'ENTITY', tier:12, cost:12, atk:13, hp:16,
    art:'garden', keywords:['丰饶'], text:'丰饶：解锁悖论区。战吼：你的后继数 +5。亡语：将一张「『花园』最终丰饶」置入手牌。',
    effects:[{when:'static', op:'unlockParadox'},{when:'battlecry', op:'successor', n:5},{when:'deathrattle', op:'addCardToHand', cardId:'071'}],
    lore:'「我也不知道。也许是一家比这里还要更阔气些的咖啡馆吧。我是园丁，也是花园，所以我想它是什么它就是什么。」',
    source:'《银之网》'
  },
  {
    id:'071', name:'『花园』最终丰饶', en:'The Garden: Final Fertility', type:'PARADOX', tier:12, cost:12,
    art:'garden', keywords:['终焉'], text:'终焉：若你的后继差 ≥ 8，你直接获胜；否则此卡完全失效。',
    effects:[{when:'cast', op:'winIfSuccessorLead', n:8}],
    lore:'「游戏是要有博弈的对手的，而我要对抗的只有我自己。我将为花园呈现【最终丰饶】。」',
    source:'《银之网》'
  },
  {
    id:'072', name:'绝对无限', en:'Absolute Infinity', type:'ENTITY', tier:12, cost:12, atk:16, hp:14,
    art:'absolute_infinity', artExt:'jpg', keywords:['不可指定'], text:'不可指定：无法被任何效果指定。战吼：抽 3 张牌。',
    effects:[{when:'static', op:'untargetableBelow', n:13},{when:'battlecry', op:'draw', n:3}],
    lore:'永无止境的未完成构造的无幂集的绝对无限，一切可构造的 n—巨大基数的集合与非其他类元素集合的真类宇宙。',
    source:'《分形图》'
  }
];

/* 按 id 索引 */
const CARD_MAP = {};
CARDS.forEach(c => { CARD_MAP[c.id] = c; });

/* 预组牌组定义 */
const DECKS = {
  silver: {
    id:'silver', name:'银之网', en:'The Silver Web', tier:6,
    desc:'超阈人类的算力网络。以星丝铺展、算力矿井与无限时间图灵机滚起雪球，用连续不断的后继操作碾压对手。',
    color:'#7dd3fc', art:'silverweb',
    hint:'低费铺场、连续操作，靠后继差取胜。',
    cardIds:['001','001','002','002','005','010','010','013','014','014','007','007','016','016','020','020','021','018','018','025','023','023','024','027','028','030','026','008','008','033']
  },
  grammar: {
    id:'grammar', name:'语法宇宙', en:'Grammar Universe', tier:9,
    desc:'沙盘造物之争。叙事者写下设定，复制者据为己有，进化者免疫一切——三方在沙盘上互相嵌套、迭代、修改操作次数本身。',
    color:'#c084fc', art:'sandbox_war',
    hint:'结构铺场、造物连锁，中期发力。',
    cardIds:['002','002','002','005','005','025','006','006','008','008','014','014','009','009','011','021','018','018','027','027','032','029','029','034','062','041','039','060','061','043']
  },
  garden: {
    id:'garden', name:'花园神祇', en:'Garden Deities', tier:12,
    desc:'transcendental 的领域。以前期嘲讽与清场撑住，由「分形尸」和「花园神祇·Transcendental」压场。万界归一者、超验矩、莫哲与「最终丰饶」等终局卡不在此预组中，需通过爬塔奖励或组牌器解锁。',
    color:'#fde047', art:'garden',
    hint:'前期用嘲讽与清场撑住，后期一击定乾坤。',
    cardIds:['002','002','002','010','010','025','007','007','008','008','014','009','009','012','012','020','018','018','022','017','027','027','023','023','032','028','029','029','063','068']
  }
};

/* 关键词词典（图鉴与悬浮提示共用） */
const KEYWORDS = {
  '嘲讽':      '敌方实体必须优先攻击具有嘲讽的单位。',
  '战吼':      '此卡从手牌打出并进入战场时触发一次。',
  '亡语':      '此卡被消灭时触发一次。',
  '锐化':      '此卡发起的层级压制只需高出 1 层即可成立（常规需要高出 2 层）。',
  '不可指定':  '无法被低于指定层级的卡牌效果选为目标，但仍受范围效果影响。',
  '丰饶':      '解锁悖论区：只要此卡在场，你每回合可打出 1 张悖论卡。',
  '终焉':      '具有终结战局能力的超级效果。',
  '延展':      '你的所有卡牌层级获得加成，包括手牌与牌库中的卡。',
  '封顶':      '限制双方的递归与迭代类效果触发次数。',
  '进化':      '每回合开始自动成长。',
  '锁定':      '限制对手下回合可执行的操作次数。'
};

/* 核心规则说明（规则书用） */
const RULES = [
  { title:'一、算力 Ψ', body:'每回合开始算力上限 +1（初始 1，上限 12，即「算力墙」），并补满至当前上限。打出卡牌、发动能力均消耗算力，攻击不消耗。未用完的算力不结转至下一回合。起手时后手多抽 1 张牌，并在其首个回合额外获得 2 点临时算力作为后手补偿。' },
  { title:'二、层级与压制', body:'层级共 13 档（T0「有限」~ T12「花园」），其中 T0 为有穷基数档，不设实体卡。当攻击方的层级 ≥ 防守方层级 +2 时，触发【归虚】：直接消灭目标，不计算任何数值；带「锐化」的单位只需高出 1 层。这对应设定中「层级碾压」的本质——更高的无限对更低的无限是绝对的支配。' },
  { title:'三、幂集跃迁', body:'每回合只能跃迁 1 次，消耗 2 点算力，使己方一张卡的层级 +1。这对应康托尔的幂集运算——任何集合的幂集都严格大于原集合。每张卡累计最多跃迁 3 次（递归上界），超过后无法继续。' },
  { title:'四、后继差 —— 第二条胜利线', body:'设定原文：「唯一有意义的，就是能实现对于敌人操作次数的碾压。你比对方有着更多的操作后继，哪怕最终只多出一次，胜负便已能分晓。」本作将其实现为：每回合结束时比较双方本回合的操作数（出牌 / 攻击 / 跃迁均计 1 次）。出于对局平衡，需本回合至少领先 2 次操作才开始累积「后继差」，且每回合最多累积 3 点；设定中「只多一次」的绝对性，由【后继碾压】的终局判定体现。当累积达到 12，该方立即获胜，无论场上局势如何。' },
  { title:'五、悖论区', body:'悖论卡在通常状态下无法打出。只有当己方场上存在「丰饶」关键词的卡（万有公理宇宙、可构造宇宙 L、冯·诺依曼宇宙 V、超视界拓扑网、莫哲·园丁）时，悖论区解锁，每回合可打出 1 张悖论卡。这对应万有公理宇宙「将矛盾也作为理论的一部分呈现」的设定。' },
  { title:'六、存在度', body:'双方各有 35 点存在度（爬塔模式为 30 点）。受到攻击或效果伤害时扣除，归零即战败；同一效果同时使双方归零时判为平局。牌库耗尽后每次抽牌会受到递增的「归虚伤害」（1、2、3……）。' }
];
