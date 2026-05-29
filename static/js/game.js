(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const screens = {
    menu: document.getElementById("mainMenu"),
    map: document.getElementById("mapScreen"),
    clear: document.getElementById("roomClearScreen"),
    challenge: document.getElementById("challengeScreen"),
    pause: document.getElementById("pauseScreen"),
    result: document.getElementById("resultScreen"),
  };

  const hud = {
    root: document.getElementById("hud"),
    hp: document.getElementById("hudHp"),
    weapon: document.getElementById("hudWeapon"),
    ammo: document.getElementById("hudAmmo"),
    inventory: document.getElementById("inventoryBtn"),
    hints: document.getElementById("controlHints"),
  };

  const ui = {
    shell: document.querySelector(".game-shell") || canvas.parentElement,
    start: document.getElementById("startBtn"),
    guide: document.getElementById("guideBtn"),
    codex: document.getElementById("codexBtn"),
    weaponStats: document.getElementById("weaponStatsBtn"),
    leaderboard: document.getElementById("leaderboardBtn"),
    settings: document.getElementById("settingsBtn"),
    monsterRoom: document.getElementById("monsterRoomBtn"),
    chestRoom: document.getElementById("chestRoomBtn"),
    geometryRoom: document.getElementById("geometryRoomBtn"),
    linearRoom: document.getElementById("linearRoomBtn"),
    randomRoomB: document.getElementById("randomRoomBBtn"),
    randomRoomC: document.getElementById("randomRoomCBtn"),
    bossRoom: document.getElementById("bossRoomBtn"),
    mapBoard: document.querySelector(".corridor-board"),
    mapPlayer: document.getElementById("mapPlayer"),
    mapPrompt: document.getElementById("mapPrompt"),
    mapLog: document.getElementById("mapLog"),
    clearEyebrow: document.getElementById("clearEyebrow"),
    clearTitle: document.getElementById("clearTitle"),
    clearText: document.getElementById("clearText"),
    weaponChoice: document.getElementById("weaponChoice"),
    weaponChoiceName: document.getElementById("weaponChoiceName"),
    acceptWeapon: document.getElementById("acceptWeaponBtn"),
    skipWeapon: document.getElementById("skipWeaponBtn"),
    backToMap: document.getElementById("backToMapBtn"),
    challengeEyebrow: document.getElementById("challengeEyebrow"),
    challengeTitle: document.getElementById("challengeTitle"),
    challengeText: document.getElementById("challengeText"),
    challengeOptions: document.querySelectorAll("[data-challenge-count]"),
    challengeBack: document.getElementById("challengeBackBtn"),
    resume: document.getElementById("resumeBtn"),
    pauseMenu: document.getElementById("pauseMenuBtn"),
    resultEyebrow: document.getElementById("resultEyebrow"),
    resultTitle: document.getElementById("resultTitle"),
    resultStats: document.getElementById("resultStats"),
    leaderboardNameForm: document.getElementById("leaderboardNameForm"),
    leaderboardNameInput: document.getElementById("leaderboardNameInput"),
    leaderboardNameStatus: document.getElementById("leaderboardNameStatus"),
    leaderboardNameSubmit: document.getElementById("leaderboardNameSubmitBtn"),
    restart: document.getElementById("restartBtn"),
    resultLeaderboard: document.getElementById("resultLeaderboardBtn"),
    menu: document.getElementById("menuBtn"),
    modal: document.getElementById("modal"),
    modalPanel: document.getElementById("modalPanel"),
    modalTitle: document.getElementById("modalTitle"),
    modalBody: document.getElementById("modalBody"),
    modalClose: document.getElementById("modalCloseBtn"),
  };

  const W = canvas.width;
  const H = canvas.height;
  const arenaInset = 10;
  const arena = {
    left: arenaInset,
    top: arenaInset,
    right: W - arenaInset,
    bottom: H - arenaInset,
  };
  arena.width = arena.right - arena.left;
  arena.height = arena.bottom - arena.top;
  const config = window.GAME_CONFIG || {};
  const baseStats = config.baseStats || {};

  const colors = {
    paper: "#f4f0e6",
    chalk: "#8fd19e",
    mint: "#b8f0c4",
    danger: "#e76f61",
    warning: "#f0c35d",
    cyan: "#82c8d8",
    muted: "#bbc4bd",
    ink: "#151718",
    line: "rgba(255,255,255,0.16)",
  };

  const keys = new Set();
  const mouse = { x: W / 2, y: H / 2, down: false };
  let mode = "menu";
  let lastTime = performance.now();
  let attackHeld = false;
  const leaderboardStorageKey = "examGameLeaderboardV1";
  const leaderboardLimit = 10;
  const defaultLeaderboardName = "考生";
  const draftShieldInterval = 10;
  const playerDamageScale = 0.9;
  const bossDamageScale = 0.85;
  const backHitMultiplier = 1.45;
  const backHitHalfAngle = Math.PI * 0.38;
  const swordSlashReach = 38;
  const swordSlashRadius = 48;
  const directBossSwordDamage = 20;
  const directBossSwordReach = 42;
  const directBossSwordRadius = 56;

  function weaponDamageScale(weapon) {
    return weapon?.id === "sword" ? 1 : playerDamageScale;
  }

  const game = {
    startedAt: 0,
    elapsed: 0,
    kills: 0,
    weaponsFound: 1,
    completed: {
      monster: false,
      chest: false,
      geometry: false,
      linear: false,
      randomB: false,
      randomC: false,
    },
    randomRooms: {
      chest: null,
      randomB: null,
      randomC: null,
    },
    mapPlayer: {
      x: 28,
      y: 91,
      facingX: 0,
      facingY: -1,
      dashCooldown: 0,
    },
    nearbyDoor: null,
    activeRoom: null,
    activeRoomKey: null,
    roomTitle: "",
    roomReward: null,
    pendingChallenge: null,
    challengeCount: 1,
    defeatedInRoom: 0,
    player: null,
    enemies: [],
    boss: null,
    obstacles: [],
    playerShots: [],
    enemyShots: [],
    enemyLasers: [],
    slashes: [],
    particles: [],
    message: "",
    lastWeaponReward: null,
    pendingWeaponChoice: null,
    pendingLeaderboardEntry: null,
    usedNonSwordWeapon: false,
    recentRewardFamilies: [],
  };

  const weapons = {
    sword: {
      id: "sword",
      name: "圣剑 ∫",
      kind: "sword",
      damage: Number(baseStats.swordDamage || 15),
      cooldown: Number(baseStats.swordCooldown || 0.5),
      ranged: false,
      infiniteAmmo: true,
    },
    functionGun: {
      id: "functionGun",
      name: "函数机枪",
      kind: "calculus",
      damage: 6,
      cooldown: 0.16,
      ranged: true,
      color: colors.mint,
      magazine: 32,
      reloadTime: 1.55,
    },
    integralSniper: {
      id: "integralSniper",
      name: "积分狙击枪",
      kind: "calculus",
      damage: 32,
      cooldown: 1.05,
      ranged: true,
      speed: 720,
      projectileRadius: 5,
      color: colors.paper,
      magazine: 4,
      reloadTime: 2.15,
      pierce: 4,
    },
    taylorCannon: {
      id: "taylorCannon",
      name: "泰勒扩散炮",
      kind: "calculus",
      damage: 7.5,
      cooldown: 0.68,
      ranged: true,
      speed: 360,
      projectileRadius: 7,
      color: colors.chalk,
      magazine: 7,
      reloadTime: 2,
      splitAfter: 0.42,
      splitCount: 5,
      splitSpread: 0.95,
      splitDamage: 0.34,
      splitSpeed: 330,
    },
    coordinateBlade: {
      id: "coordinateBlade",
      name: "坐标系大宝剑",
      kind: "geometry",
      damage: 8.5,
      cooldown: 0.62,
      ranged: false,
      infiniteAmmo: true,
      special: "crossSlash",
      slashReach: 32,
      slashRadius: 52,
      color: colors.cyan,
    },
    polarShotgun: {
      id: "polarShotgun",
      name: "极坐标霰弹枪",
      kind: "geometry",
      damage: 3.8,
      cooldown: 0.54,
      ranged: true,
      pellets: 6,
      spread: 0.72,
      speed: 470,
      projectileRadius: 4,
      color: colors.cyan,
      magazine: 6,
      reloadTime: 2.1,
    },
    geometryShield: {
      id: "geometryShield",
      name: "几何护盾",
      kind: "geometry",
      damage: 9.5,
      cooldown: 0.9,
      ranged: false,
      infiniteAmmo: true,
      special: "shieldPulse",
      color: colors.cyan,
      shieldValue: 45,
      shieldEvery: 8.5,
      pulseRadius: 72,
      shotClearRadius: 92,
    },
    matrixRpg: {
      id: "matrixRpg",
      name: "矩阵 RPG",
      kind: "linear",
      damage: 22,
      cooldown: 0.92,
      ranged: true,
      speed: 330,
      projectileRadius: 9,
      color: colors.warning,
      magazine: 4,
      reloadTime: 2.4,
      blastRadius: 48,
    },
    luStaff: {
      id: "luStaff",
      name: "LU 分解法杖",
      kind: "linear",
      damage: 8,
      cooldown: 0.64,
      ranged: true,
      speed: 390,
      projectileRadius: 5,
      color: colors.warning,
      magazine: 9,
      reloadTime: 2,
      splitAfter: 0.34,
      splitPattern: "lu",
      splitDamage: 0.34,
      splitSpeed: 360,
    },
    determinantLaser: {
      id: "determinantLaser",
      name: "行列式激光",
      kind: "linear",
      damage: 2.7,
      cooldown: 0.1,
      ranged: true,
      speed: 920,
      projectileRadius: 3,
      color: colors.danger,
      magazine: 50,
      reloadTime: 2.05,
      pierce: 2,
      beamLength: 56,
      shape: "beam",
    },
  };

  const chestWeaponIds = [
    "functionGun",
    "integralSniper",
    "taylorCannon",
    "coordinateBlade",
    "polarShotgun",
    "geometryShield",
    "matrixRpg",
    "luStaff",
    "determinantLaser",
  ];

  const buffRewardIds = [
    "临时抱佛脚",
    "熬夜咖啡",
    "公式大全",
    "草稿纸护盾",
    "错题本",
    "绩点守护",
    "学霸笔记",
  ];

  function cloneWeapon(id) {
    const weapon = { ...weapons[id] };
    weapon.level = 1;
    weapon.baseDamage = weapon.damage;
    weapon.baseCooldown = weapon.cooldown;
    if (!weapon.infiniteAmmo) {
      weapon.baseMagazine = weapon.magazine;
      weapon.baseReloadTime = weapon.reloadTime;
      weapon.ammo = weapon.magazine;
      weapon.reloading = false;
      weapon.reloadTimer = 0;
    }
    return weapon;
  }

  function displayWeaponName(weapon) {
    if (!weapon) return "";
    const bonus = (weapon.level || 1) - 1;
    const name = weapon.directBossAwakened && weapon.id === "sword" ? `${weapon.name}·觉醒` : weapon.name;
    return bonus > 0 ? `${name} +${bonus}` : name;
  }

  function applyWeaponLevelStats(weapon) {
    const bonus = Math.max(0, (weapon.level || 1) - 1);
    weapon.damage = Math.round(weapon.baseDamage * (1 + bonus * 0.18) * 10) / 10;
    weapon.cooldown = Math.max(weapon.baseCooldown * 0.72, weapon.baseCooldown * (1 - bonus * 0.04));
    if (!weapon.infiniteAmmo) {
      weapon.magazine = weapon.baseMagazine + Math.ceil(weapon.baseMagazine * bonus * 0.22);
      weapon.reloadTime = Math.max(weapon.baseReloadTime * 0.62, weapon.baseReloadTime * (1 - bonus * 0.08));
    }
  }

  function upgradeWeapon(weapon) {
    if (!weapon) return weapon;
    const oldMagazine = weapon.magazine || 0;
    weapon.level = Math.min((weapon.level || 1) + 1, 6);
    applyWeaponLevelStats(weapon);
    if (!weapon.infiniteAmmo && !weapon.reloading) {
      const gainedAmmo = Math.max(0, weapon.magazine - oldMagazine);
      weapon.ammo = Math.min(weapon.magazine, (weapon.ammo || 0) + gainedAmmo);
    }
    return weapon;
  }

  function awakenDirectBossSword(player, direct) {
    const sword = player?.weapons?.find((weapon) => weapon.id === "sword");
    if (!sword) return false;
    if (!direct) return false;
    sword.directBossAwakened = true;
    sword.baseDamage = Math.max(sword.baseDamage || sword.damage, directBossSwordDamage);
    sword.damage = Math.max(sword.damage, directBossSwordDamage);
    sword.slashReach = Math.max(sword.slashReach || swordSlashReach, directBossSwordReach);
    sword.slashRadius = Math.max(sword.slashRadius || swordSlashRadius, directBossSwordRadius);
    if (player.weapon?.id === "sword") {
      player.weapon = sword;
    }
    return true;
  }

  function weaponFamilyIds(weaponId) {
    return [weaponId];
  }

  function hasWeaponFamily(player, weaponId) {
    const equivalentIds = weaponFamilyIds(weaponId);
    return Boolean(player?.weapons?.some((weapon) => equivalentIds.includes(weapon.id)));
  }

  function canonicalWeaponFamily(weaponId) {
    return weaponId;
  }

  function rememberRewardFamily(weaponId) {
    if (!weaponId) return;
    const family = canonicalWeaponFamily(weaponId);
    game.recentRewardFamilies = [
      family,
      ...(game.recentRewardFamilies || []).filter((item) => item !== family),
    ].slice(0, 3);
  }

  function recentFamilyWeight(weaponId) {
    const family = canonicalWeaponFamily(weaponId);
    const recentIndex = (game.recentRewardFamilies || []).indexOf(family);
    if (recentIndex === 0) return 0.35;
    if (recentIndex === 1) return 0.6;
    if (recentIndex === 2) return 0.8;
    return 1;
  }

  function weightedPick(items, weightFor) {
    if (!items.length) return null;
    const weights = items.map((item) => Math.max(0, Number(weightFor(item)) || 0));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) {
      return items[Math.floor(Math.random() * items.length)];
    }
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function pickChestWeapon(player) {
    const unowned = chestWeaponIds.filter((id) => !hasWeaponFamily(player, id));
    const pool = unowned.length ? unowned : chestWeaponIds;
    return weightedPick(pool, recentFamilyWeight);
  }

  function pickChestBuff() {
    return buffRewardIds[Math.floor(Math.random() * buffRewardIds.length)];
  }

  function randomMonsterFamilyGroups() {
    return randomMonsterPool.reduce((groups, enemy) => {
      const family = canonicalWeaponFamily(enemy.rewardWeapon);
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family).push(enemy);
      return groups;
    }, new Map());
  }

  function pickRandomMonsterEnemy() {
    const groups = randomMonsterFamilyGroups();
    const family = weightedPick(Array.from(groups.keys()), recentFamilyWeight);
    const enemies = groups.get(family) || randomMonsterPool;
    return enemies[Math.floor(Math.random() * enemies.length)];
  }

  function dropModelForVerify() {
    const groups = randomMonsterFamilyGroups();
    return {
      chestCandidates: [...chestWeaponIds],
      chestUnownedCandidates: chestWeaponIds.filter((id) => !hasWeaponFamily(game.player, id)),
      chestBuffCandidates: [...buffRewardIds],
      randomRewardFamilies: Array.from(groups.keys()),
      randomFamilyEntryCounts: Object.fromEntries(
        Array.from(groups.entries()).map(([family, enemies]) => [family, enemies.length])
      ),
      recentRewardFamilies: [...(game.recentRewardFamilies || [])],
    };
  }

  const monsterRooms = {
    monster: {
      completedKey: "monster",
      title: "微积分怪物房",
      label: "微积分怪物房：拉格朗日投影",
      rewardWeapon: "functionGun",
      rewardBuff: "函数机枪",
      clearTitle: "拉格朗日投影被击败",
      clearText: "你获得了正常版函数机枪。现在再去挑战 Boss 会轻松很多。",
      enemy: {
        id: "lagrange",
        name: "拉格朗日投影",
        shortName: "L",
        kind: "calculus",
        pattern: "wave",
        color: colors.chalk,
        hp: Number(baseStats.enemyHp || 60),
        radius: 24,
        moveAmp: 70,
        moveSpeed: 2,
        fireEvery: 0.72,
      },
    },
    geometry: {
      completedKey: "geometry",
      title: "欧氏几何怪物房",
      label: "欧氏几何教室：笛卡尔投影",
      rewardWeapon: "polarShotgun",
      rewardBuff: "极坐标霰弹枪",
      clearTitle: "笛卡尔投影被击败",
      clearText: "你获得了极坐标霰弹枪。它会扇形散射，对近距离目标很凶。",
      enemy: {
        id: "descartesShade",
        name: "笛卡尔投影",
        shortName: "D",
        kind: "geometry",
        pattern: "cross",
        color: colors.cyan,
        hp: 90,
        radius: 24,
        moveAmp: 92,
        moveSpeed: 1.55,
        fireEvery: 0.95,
      },
    },
    linear: {
      completedKey: "linear",
      title: "线性代数怪物房",
      label: "线性代数教室：高斯投影",
      rewardWeapon: "matrixRpg",
      rewardBuff: "矩阵 RPG",
      clearTitle: "高斯投影被击败",
      clearText: "你获得了矩阵 RPG。单发慢，但伤害高，适合打 Boss 核心。",
      enemy: {
        id: "gaussShade",
        name: "高斯投影",
        shortName: "G",
        kind: "linear",
        pattern: "wall",
        color: colors.warning,
        hp: 110,
        radius: 25,
        moveAmp: 58,
        moveSpeed: 1.15,
        fireEvery: 1.08,
      },
    },
  };

  const randomMonsterPool = [
    {
      id: "lagrangeRandomShade",
      name: "拉格朗日投影",
      shortName: "L",
      kind: "calculus",
      pattern: "wave",
      color: colors.chalk,
      rewardWeapon: "functionGun",
      rewardBuff: "函数机枪",
      hp: 76,
      radius: 24,
      moveAmp: 78,
      moveSpeed: 1.9,
      fireEvery: 0.82,
    },
    {
      id: "lhopitalShade",
      name: "洛必达投影",
      shortName: "H",
      kind: "calculus",
      pattern: "aimed",
      color: colors.paper,
      rewardWeapon: "integralSniper",
      rewardBuff: "洛必达法则",
      hp: 88,
      radius: 23,
      moveAmp: 62,
      moveSpeed: 1.5,
      fireEvery: 1.12,
    },
    {
      id: "taylorShade",
      name: "泰勒投影",
      shortName: "T",
      kind: "calculus",
      pattern: "split",
      color: colors.chalk,
      rewardWeapon: "functionGun",
      rewardBuff: "泰勒展开",
      hp: 82,
      radius: 23,
      moveAmp: 86,
      moveSpeed: 1.8,
      fireEvery: 0.9,
    },
    {
      id: "archimedesShade",
      name: "阿基米德投影",
      shortName: "A",
      kind: "geometry",
      pattern: "circle",
      color: colors.cyan,
      rewardWeapon: "coordinateBlade",
      rewardBuff: "圆面积",
      hp: 88,
      radius: 24,
      moveAmp: 72,
      moveSpeed: 1.4,
      fireEvery: 1.0,
    },
    {
      id: "descartesRandomShade",
      name: "笛卡尔投影",
      shortName: "D",
      kind: "geometry",
      pattern: "cross",
      color: colors.cyan,
      rewardWeapon: "polarShotgun",
      rewardBuff: "极坐标霰弹枪",
      hp: 94,
      radius: 24,
      moveAmp: 84,
      moveSpeed: 1.45,
      fireEvery: 1.0,
    },
    {
      id: "euclidShade",
      name: "欧几里得投影",
      shortName: "E",
      kind: "geometry",
      pattern: "triangle",
      color: colors.cyan,
      rewardWeapon: "geometryShield",
      rewardBuff: "几何直觉",
      hp: 90,
      radius: 24,
      moveAmp: 68,
      moveSpeed: 1.45,
      fireEvery: 1.05,
    },
    {
      id: "jacobiShade",
      name: "雅可比投影",
      shortName: "J",
      kind: "linear",
      pattern: "matrix",
      color: colors.warning,
      rewardWeapon: "matrixRpg",
      rewardBuff: "雅可比矩阵",
      hp: 100,
      radius: 24,
      moveAmp: 68,
      moveSpeed: 1.25,
      fireEvery: 1.02,
    },
    {
      id: "jordanShade",
      name: "若尔当投影",
      shortName: "J",
      kind: "linear",
      pattern: "split",
      color: colors.warning,
      rewardWeapon: "luStaff",
      rewardBuff: "约旦标准型",
      hp: 98,
      radius: 24,
      moveAmp: 74,
      moveSpeed: 1.35,
      fireEvery: 0.98,
    },
    {
      id: "gaussRandomShade",
      name: "高斯投影",
      shortName: "G",
      kind: "linear",
      pattern: "wall",
      color: colors.warning,
      rewardWeapon: "determinantLaser",
      rewardBuff: "高斯消元",
      hp: 105,
      radius: 25,
      moveAmp: 58,
      moveSpeed: 1.2,
      fireEvery: 1.05,
    },
  ];

  function createPlayer() {
    const startingWeapon = cloneWeapon("sword");
    return {
      x: W * 0.5,
      y: H * 0.72,
      r: 15,
      hp: Number(baseStats.hp || 100),
      maxHp: Number(baseStats.hp || 100),
      speed: Number(baseStats.speed || 3.5),
      weapon: startingWeapon,
      weapons: [startingWeapon],
      weaponIndex: 0,
      buffs: [],
      shield: 0,
      shieldTimer: 0,
      blockCharges: 0,
      blockTimer: 0,
      mistakeBoostTimer: 0,
      gpaGuardUsed: false,
      attackTimer: 0,
      dashCooldown: 0,
      invuln: 0,
    };
  }

  function grantBuff(player, name) {
    if (!player || !name) return;
    player.buffs.push(name);
    if (name === "临时抱佛脚") {
      player.hp = Math.min(player.maxHp, player.hp + 30);
    }
    if (name === "草稿纸护盾") {
      player.blockCharges = Math.min(maxDraftShieldCharges(player), (player.blockCharges || 0) + 1);
      player.blockTimer = draftShieldInterval;
    }
    if (name === "绩点守护") {
      player.gpaGuardUsed = false;
    }
  }

  function hasBuff(player, name) {
    return Boolean(player?.buffs?.includes(name));
  }

  function maxDraftShieldCharges(player) {
    return hasBuff(player, "草稿纸护盾") ? 1 : 0;
  }

  function addWeapon(player, weaponId, equip = true) {
    if (!player) return false;
    game.lastWeaponReward = null;

    const equivalentIds = weaponFamilyIds(weaponId);
    const existingIndex = player.weapons.findIndex((weapon) => equivalentIds.includes(weapon.id));

    if (existingIndex >= 0) {
      const existingWeapon = player.weapons[existingIndex];
      upgradeWeapon(existingWeapon);
      game.lastWeaponReward = { type: "upgrade", weapon: existingWeapon };
      game.weaponsFound = player.weapons.length;
      if (equip) setWeaponIndex(existingIndex);
      return true;
    }

    const newWeapon = cloneWeapon(weaponId);
    player.weapons.push(newWeapon);
    game.lastWeaponReward = { type: "new", weapon: newWeapon };
    game.weaponsFound = player.weapons.length;
    if (equip) setWeaponIndex(player.weapons.length - 1);
    return true;
  }

  function weaponRewardText(defaultText) {
    const reward = game.lastWeaponReward;
    if (!reward) return defaultText;
    if (reward.type === "upgrade") {
      return `重复获得${reward.weapon.name}，${displayWeaponName(reward.weapon)}强化成功：伤害、弹匣和换弹效率提升。`;
    }
    return defaultText;
  }

  function weaponChoiceName(weaponId) {
    return displayWeaponName(weapons[weaponId]) || weaponId || "未知武器";
  }

  function updateWeaponChoiceUi() {
    const choice = game.pendingWeaponChoice;
    if (ui.weaponChoice) ui.weaponChoice.hidden = !choice;
    if (ui.weaponChoiceName) {
      ui.weaponChoiceName.textContent = choice
        ? choice.title || `发现武器：${weaponChoiceName(choice.weaponId)}`
        : "";
    }
    if (ui.acceptWeapon) ui.acceptWeapon.textContent = choice?.acceptLabel || "加入背包";
    if (ui.skipWeapon) ui.skipWeapon.textContent = choice?.skipLabel || "不加入";
    if (ui.acceptWeapon) ui.acceptWeapon.disabled = !choice;
    if (ui.skipWeapon) ui.skipWeapon.disabled = !choice;
    if (ui.backToMap) ui.backToMap.disabled = Boolean(choice);
  }

  function resolveWeaponChoice(accept) {
    const choice = game.pendingWeaponChoice;
    if (!choice) return false;
    const weaponName = weaponChoiceName(choice.weaponId);
    game.pendingWeaponChoice = null;
    if (accept) {
      const added = addWeapon(game.player, choice.weaponId, true);
      if (added) rememberRewardFamily(choice.weaponId);
      const joinedName = displayWeaponName(game.lastWeaponReward?.weapon || weapons[choice.weaponId]);
      const defaultText = choice.acceptText || `已加入背包：${joinedName}。`;
      ui.clearText.textContent = `${weaponRewardText(defaultText)}${choice.rewardSuffix || ""}`;
    } else {
      game.lastWeaponReward = null;
      if (choice.altBuff) {
        grantBuff(game.player, choice.altBuff);
      }
      ui.clearText.textContent = choice.skipText || `没有加入${weaponName}，本局仍保留圣剑榜资格。${choice.rewardSuffix || ""}`;
    }
    updateWeaponChoiceUi();
    updateHud();
    return true;
  }

  function setWeaponIndex(index) {
    const player = game.player;
    if (!player || index < 0 || index >= player.weapons.length) return false;
    player.weaponIndex = index;
    player.weapon = player.weapons[index];
    player.attackTimer = 0;
    updateHud();
    return true;
  }

  function cycleWeapon(direction = 1) {
    const player = game.player;
    if (!player || player.weapons.length < 2) return false;
    const nextIndex = (player.weaponIndex + direction + player.weapons.length) % player.weapons.length;
    return setWeaponIndex(nextIndex);
  }

  function startReload(weapon) {
    if (!weapon || weapon.infiniteAmmo || weapon.reloading || weapon.ammo >= weapon.magazine) {
      return false;
    }
    weapon.reloading = true;
    weapon.reloadTimer = weapon.reloadTime;
    return true;
  }

  function updateWeaponReloads(dt) {
    const player = game.player;
    if (!player) return;
    player.weapons.forEach((weapon) => {
      if (!weapon.reloading) return;
      weapon.reloadTimer = Math.max(0, weapon.reloadTimer - dt);
      if (weapon.reloadTimer <= 0) {
        weapon.reloading = false;
        weapon.ammo = weapon.magazine;
      }
    });
  }

  function updatePassiveShield(dt) {
    const player = game.player;
    if (!player) return;
    if (hasBuff(player, "草稿纸护盾")) {
      const maxCharges = maxDraftShieldCharges(player);
      if ((player.blockCharges || 0) >= maxCharges) {
        player.blockTimer = draftShieldInterval;
      } else {
        player.blockTimer = Math.max(0, (player.blockTimer || draftShieldInterval) - dt);
        if (player.blockTimer <= 0) {
          player.blockCharges = Math.min(maxCharges, (player.blockCharges || 0) + 1);
          player.blockTimer = draftShieldInterval;
          burst(player.x, player.y, colors.paper, 14);
        }
      }
    }
    const shieldWeapon = player.weapons.find((weapon) => weapon.special === "shieldPulse");
    if (!shieldWeapon) return;
    player.shieldTimer = Math.max(0, (player.shieldTimer || 0) - dt);
    if (player.shieldTimer > 0) return;
    const bonus = Math.max(0, (shieldWeapon.level || 1) - 1);
    const shieldValue = Math.round((shieldWeapon.shieldValue || 40) * (1 + bonus * 0.12));
    player.shield = Math.max(player.shield || 0, shieldValue);
    player.shieldTimer = shieldWeapon.shieldEvery || 8;
  }

  function ammoLabel(weapon) {
    if (!weapon || weapon.infiniteAmmo) return "无限";
    if (weapon.reloading) return `换弹 ${weapon.reloadTimer.toFixed(1)}s`;
    return `${weapon.ammo}/${weapon.magazine}`;
  }

  function resetGame() {
    mode = "map";
    game.startedAt = performance.now();
    game.elapsed = 0;
    game.kills = 0;
    game.weaponsFound = 1;
    game.completed.monster = false;
    game.completed.chest = false;
    game.completed.geometry = false;
    game.completed.linear = false;
    game.completed.randomB = false;
    game.completed.randomC = false;
    game.randomRooms.chest = null;
    game.randomRooms.randomB = null;
    game.randomRooms.randomC = null;
    game.mapPlayer.x = 28;
    game.mapPlayer.y = 91;
    game.mapPlayer.facingX = 0;
    game.mapPlayer.facingY = -1;
    game.mapPlayer.dashCooldown = 0;
    game.nearbyDoor = null;
    game.activeRoom = null;
    game.activeRoomKey = null;
    game.roomTitle = "";
    game.roomReward = null;
    game.pendingChallenge = null;
    game.challengeCount = 1;
    game.defeatedInRoom = 0;
    game.player = createPlayer();
    game.enemies = [];
    game.boss = null;
    game.obstacles = [];
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    game.lastWeaponReward = null;
    game.pendingWeaponChoice = null;
    game.pendingLeaderboardEntry = null;
    game.usedNonSwordWeapon = false;
    game.recentRewardFamilies = [];
    hideLeaderboardNameForm();
    game.message = "当前状态：刚进入复习走廊。";
    updateMap();
    showScreen("map");
    updateHud();
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => {
      element.hidden = key !== name;
    });
    document.body.classList.toggle("combat-active", name === "combat");
    if (hud.root) hud.root.hidden = name !== "combat";
    if (hud.hints) hud.hints.hidden = name !== "combat";
  }

  function enterMap(message) {
    mode = "map";
    game.enemies = [];
    game.boss = null;
    game.obstacles = [];
    game.activeRoom = null;
    game.activeRoomKey = null;
    game.roomTitle = "";
    game.roomReward = null;
    game.pendingWeaponChoice = null;
    game.pendingChallenge = null;
    game.challengeCount = 1;
    game.defeatedInRoom = 0;
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    if (message) {
      game.message = message;
    }
    updateMap();
    showScreen("map");
    updateHud();
  }

  function updateMap() {
    syncDoor("monster", ui.monsterRoom);
    syncDoor("chest", ui.chestRoom);
    syncDoor("geometry", ui.geometryRoom);
    syncDoor("linear", ui.linearRoom);
    syncDoor("randomB", ui.randomRoomB);
    syncDoor("randomC", ui.randomRoomC);

    const upgraded = Object.values(game.completed).some(Boolean);
    ui.bossRoom.classList.toggle("completed", upgraded);
    ui.mapLog.textContent = game.message;
    updateMapPlayerUI();
  }

  function randomRoomTitle(roomKey) {
    if (roomKey === "chest") return "随机教室 A";
    if (roomKey === "randomB") return "随机教室 B";
    return "随机教室 C";
  }

  function syncDoor(key, button) {
    const done = game.completed[key];
    button.disabled = done;
    button.classList.toggle("completed", done);
  }

  function obstacleSafeCircles(roomType) {
    const safeCircles = [
      { x: game.player?.x || W * 0.5, y: game.player?.y || H * 0.74, r: 86 },
      ...game.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y, r: enemy.r + 58 })),
    ];

    if (roomType === "boss" && game.boss) {
      safeCircles.push({ x: game.boss.x, y: game.boss.y, r: 128 });
      game.boss.cores.forEach((core) => {
        const pos = corePosition(core);
        safeCircles.push({ x: pos.x, y: pos.y, r: 64 });
      });
    }

    return safeCircles;
  }

  function createRoomObstacle(roomType, existing = [], ignoredObstacle = null, forcedShape = null) {
    const safeCircles = obstacleSafeCircles(roomType);
    for (let attempts = 0; attempts < 120; attempts += 1) {
      const obstacle = createRandomObstacleShape(roomType, forcedShape);

      const hasSafeSpace = safeCircles.every((circleRef) => !circleObstacleCollision(circleRef, obstacle, circleRef.r));
      const separated = existing.every((other) => other === ignoredObstacle || !rectsOverlap(expandRect(obstacle, 34), expandRect(other, 34)));
      if (hasSafeSpace && separated) {
        return obstacle;
      }
    }
    return null;
  }

  function createRandomObstacleShape(roomType, forcedShape = null) {
    const center = {
      x: arena.left + 78 + Math.random() * (arena.width - 156),
      y: arena.top + 78 + Math.random() * (arena.height - 138),
    };
    if (forcedShape === "line") return createLineObstacle(center);
    if (forcedShape === "curve") return createCurveObstacle(center);
    if (forcedShape === "blob") return createBlobObstacle(center);
    if (forcedShape === "rect") return createRectObstacle(center, roomType);
    const roll = Math.random();
    if (roll < 0.34) return createLineObstacle(center);
    if (roll < 0.64) return createCurveObstacle(center);
    if (roll < 0.84) return createBlobObstacle(center);
    return createRectObstacle(center, roomType);
  }

  function createRectObstacle(center, roomType) {
    const wide = Math.random() > 0.42;
    const obstacle = {
      shape: "rect",
      x: center.x,
      y: center.y,
      w: wide ? 38 + Math.random() * 24 : 16 + Math.random() * 12,
      h: wide ? 14 + Math.random() * 10 : 34 + Math.random() * 20,
    };
    if (roomType === "boss") {
      obstacle.w *= 0.9;
      obstacle.h *= 0.9;
    }
    obstacle.x -= obstacle.w / 2;
    obstacle.y -= obstacle.h / 2;
    return obstacle;
  }

  function createLineObstacle(center) {
    const length = 46 + Math.random() * 28;
    const angle = Math.random() * Math.PI * 2;
    const half = length / 2;
    const thickness = 9 + Math.random() * 5;
    const points = [
      { x: center.x - Math.cos(angle) * half, y: center.y - Math.sin(angle) * half },
      { x: center.x + Math.cos(angle) * half, y: center.y + Math.sin(angle) * half },
    ];
    return obstacleFromPoints("line", points, thickness);
  }

  function createCurveObstacle(center) {
    const length = 54 + Math.random() * 28;
    const angle = Math.random() * Math.PI * 2;
    const bend = (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 16);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const px = -dy;
    const py = dx;
    const start = { x: center.x - dx * length / 2, y: center.y - dy * length / 2 };
    const control = { x: center.x + px * bend, y: center.y + py * bend };
    const end = { x: center.x + dx * length / 2, y: center.y + dy * length / 2 };
    const points = [];
    for (let i = 0; i <= 6; i += 1) {
      const t = i / 6;
      const mt = 1 - t;
      points.push({
        x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
      });
    }
    return obstacleFromPoints("curve", points, 8 + Math.random() * 5);
  }

  function createBlobObstacle(center) {
    const count = 5 + Math.floor(Math.random() * 3);
    const rx = 15 + Math.random() * 10;
    const ry = 12 + Math.random() * 9;
    const points = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.22;
      const scale = 0.74 + Math.random() * 0.42;
      points.push({
        x: center.x + Math.cos(angle) * rx * scale,
        y: center.y + Math.sin(angle) * ry * scale,
      });
    }
    return obstacleFromPoints("blob", points, 2);
  }

  function obstacleFromPoints(shape, points, thickness = 8) {
    const padding = shape === "blob" ? 2 : thickness / 2;
    const bounds = pointsBounds(points, padding);
    return {
      shape,
      points,
      thickness,
      ...bounds,
    };
  }

  function pointsBounds(points, padding = 0) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + padding;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function generateRoomObstacles(roomType) {
    const count = roomType === "boss" ? 4 : 2 + Math.floor(Math.random() * 3);
    const obstacles = [];

    for (let i = 0; i < count; i += 1) {
      const forcedShape = i === 0 ? ["line", "curve", "blob"][Math.floor(Math.random() * 3)] : null;
      const obstacle = createRoomObstacle(roomType, obstacles, null, forcedShape);
      if (obstacle) obstacles.push(obstacle);
    }
    return obstacles;
  }

  function mapDoorDefs() {
    return [
      { key: "geometry", label: "欧氏几何", x: 26, y: 33, enter: () => startMonsterRoom("geometry") },
      { key: "monster", label: "微积分", x: 26, y: 58, enter: () => startMonsterRoom("monster") },
      { key: "linear", label: "线性代数", x: 26, y: 83, enter: () => startMonsterRoom("linear") },
      { key: "boss", label: "三位一体", x: 50, y: 14, enter: () => startBossRoom() },
      { key: "randomB", label: "随机教室", x: 76, y: 33, enter: () => startRandomRoom("randomB") },
      { key: "randomC", label: "随机教室", x: 76, y: 58, enter: () => startRandomRoom("randomC") },
      { key: "chest", label: "随机教室", x: 76, y: 83, enter: () => startRandomRoom("chest") },
    ];
  }

  function updateMapPlayer(dt) {
    game.mapPlayer.dashCooldown = Math.max(0, (game.mapPlayer.dashCooldown || 0) - dt);
    const dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      const speed = 30;
      game.mapPlayer.facingX = dx / len;
      game.mapPlayer.facingY = dy / len;
      const stepX = (dx / len) * speed * dt;
      const stepY = (dy / len) * speed * dt;
      moveMapPlayer(stepX, stepY);
    }
    updateMapPlayerUI();
  }

  function dashMapPlayer() {
    if ((game.mapPlayer.dashCooldown || 0) > 0) return false;
    const dirX = game.mapPlayer.facingX || 0;
    const dirY = game.mapPlayer.facingY || -1;
    const len = Math.hypot(dirX, dirY) || 1;
    moveMapPlayer((dirX / len) * 16, (dirY / len) * 16);
    game.mapPlayer.dashCooldown = 0.55;
    updateMapPlayerUI();
    return true;
  }

  function moveMapPlayer(stepX, stepY) {
    const current = game.mapPlayer;
    const nextX = current.x + stepX;
    const nextY = current.y + stepY;
    if (isMapWalkable(nextX, nextY)) {
      current.x = nextX;
      current.y = nextY;
      return;
    }
    if (isMapWalkable(nextX, current.y)) {
      current.x = nextX;
    }
    if (isMapWalkable(current.x, nextY)) {
      current.y = nextY;
    }
  }

  function mapWalkZones() {
    return [
      { x1: 23.5, x2: 78.5, y1: 8.5, y2: 93 },
      { x1: 23.5, x2: 78.5, y1: 7, y2: 19 },
    ];
  }

  function isMapWalkable(x, y) {
    return mapWalkZones().some((zone) => x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2);
  }

  function nearestMapDoor() {
    let nearest = null;
    mapDoorDefs().forEach((door) => {
      const dx = game.mapPlayer.x - door.x;
      const dy = (game.mapPlayer.y - door.y) * 1.35;
      const distanceValue = Math.hypot(dx, dy);
      if (distanceValue <= 7.5 && (!nearest || distanceValue < nearest.distance)) {
        nearest = {
          ...door,
          distance: distanceValue,
          completed: door.key !== "boss" && Boolean(game.completed[door.key]),
        };
      }
    });
    return nearest;
  }

  function updateMapPlayerUI() {
    if (!ui.mapPlayer) return;
    ui.mapPlayer.style.left = `${game.mapPlayer.x}%`;
    ui.mapPlayer.style.top = `${game.mapPlayer.y}%`;

    const door = nearestMapDoor();
    game.nearbyDoor = door;
    if (!ui.mapPrompt) return;
    if (!door) {
      ui.mapPrompt.hidden = true;
      return;
    }
    ui.mapPrompt.hidden = false;
    ui.mapPrompt.style.left = `${door.x}%`;
    ui.mapPrompt.style.top = `${Math.max(12, door.y - 6)}%`;
    ui.mapPrompt.textContent = door.completed ? "已完成" : `按 E 进入 ${door.label}`;
  }

  function enterNearbyMapDoor() {
    const door = nearestMapDoor();
    if (!door || door.completed) return false;
    ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].forEach((code) => keys.delete(code));
    door.enter();
    return true;
  }

  function openChallengeSelect(roomKey = "monster", overrideRoom = null) {
    const room = overrideRoom || monsterRooms[roomKey];
    if (!room || game.completed[room.completedKey]) return;

    mode = "challenge";
    game.pendingChallenge = { roomKey, room };
    game.challengeCount = 1;
    game.defeatedInRoom = 0;
    if (ui.challengeEyebrow) ui.challengeEyebrow.textContent = room.title || "怪物房";
    if (ui.challengeTitle) ui.challengeTitle.textContent = "选择挑战人数";
    if (ui.challengeText) {
      ui.challengeText.textContent = `${room.label}。挑战人数越多，战斗压力越大，奖励也越好。`;
    }
    showScreen("challenge");
    updateHud();
  }

  function beginMonsterChallenge(count = 1) {
    const pending = game.pendingChallenge;
    const room = pending?.room || monsterRooms.monster;
    if (!room || game.completed[room.completedKey]) return;
    const challengeCount = clamp(Math.round(Number(count) || 1), 1, 3);

    mode = "combat";
    game.activeRoom = "monster";
    game.activeRoomKey = room.completedKey;
    game.roomTitle = room.label;
    game.challengeCount = challengeCount;
    game.defeatedInRoom = 0;
    game.roomReward = {
      weapon: room.rewardWeapon || room.enemy.rewardWeapon,
      buff: room.rewardBuff || room.enemy.rewardBuff,
      clearEyebrow: room.title,
      clearTitle: room.clearTitle || `${room.enemy.name}被击败`,
      clearText: room.clearText || `你击败了${room.enemy.name}，获得了新的武器和增益。`,
    };
    game.pendingChallenge = null;
    game.player.x = W * 0.5;
    game.player.y = H * 0.74;
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    game.enemies = buildChallengeEnemies(room, challengeCount);
    game.obstacles = generateRoomObstacles("monster");
    showScreen("combat");
    updateHud();
  }

  function buildChallengeEnemies(room, count) {
    return selectChallengeEnemyDefs(room, count).map((enemyDef, index) => createChallengeEnemy(enemyDef, index, count));
  }

  function selectChallengeEnemyDefs(room, count) {
    const primary = room.enemy;
    const selected = [primary];
    const sameKind = randomMonsterPool.filter((enemy) => enemy.kind === primary.kind && enemy.id !== primary.id);
    const fallback = randomMonsterPool.filter((enemy) => enemy.id !== primary.id && enemy.kind !== primary.kind);
    const pool = [...sameKind, ...fallback];

    while (selected.length < count) {
      const unused = pool.filter((enemy) => !selected.some((picked) => picked.id === enemy.id));
      const source = unused.length ? unused : pool;
      const next = source[Math.floor(Math.random() * source.length)] || primary;
      selected.push(next);
    }
    return selected;
  }

  function createChallengeEnemy(enemyDef, index, count) {
    const positions = {
      1: [{ x: W * 0.5, y: H * 0.26 }],
      2: [
        { x: W * 0.38, y: H * 0.27 },
        { x: W * 0.62, y: H * 0.27 },
      ],
      3: [
        { x: W * 0.28, y: H * 0.29 },
        { x: W * 0.5, y: H * 0.23 },
        { x: W * 0.72, y: H * 0.29 },
      ],
    };
    const position = positions[count]?.[index] || positions[1][0];
    const hpScale = count === 1 ? 1 : count === 2 ? 0.9 : 0.78;
    const fireScale = count === 1 ? 1 : count === 2 ? 1.18 : 1.38;
    const hp = Math.max(42, Math.round(enemyDef.hp * hpScale));

    return {
      id: `${enemyDef.id}-${game.activeRoomKey}-${index}`,
      name: enemyDef.name,
      shortName: enemyDef.shortName,
      kind: enemyDef.kind,
      pattern: enemyDef.pattern,
      color: enemyDef.color,
      x: position.x,
      y: position.y,
      baseX: position.x,
      baseY: position.y,
      r: enemyDef.radius,
      hp,
      maxHp: hp,
      fireTimer: 0.65 + index * 0.32,
      moveT: index * 1.15,
      moveAmp: enemyDef.moveAmp * (count === 1 ? 1 : count === 2 ? 0.88 : 0.74),
      moveSpeed: enemyDef.moveSpeed * (count === 3 ? 0.9 : 1),
      fireEvery: enemyDef.fireEvery * fireScale,
      facingAngle: Math.PI / 2,
      backHitFlash: 0,
      defeated: false,
    };
  }

  function startMonsterRoom(roomKey = "monster", overrideRoom = null) {
    return openChallengeSelect(roomKey, overrideRoom);
  }

  function openChestRoom(roomKey = "chest") {
    if (game.completed[roomKey]) return;
    game.completed[roomKey] = true;
    const rewardWeapon = pickChestWeapon(game.player);
    const rewardBuff = pickChestBuff();

    if (rewardWeapon) {
      const weaponName = weaponChoiceName(rewardWeapon);
      showClear(
        "宝箱房",
        "宝箱打开了",
        `宝箱里出现了两个奖励：武器「${weaponName}」和增益「${rewardBuff}」。只能选择其中一个。`,
        {
          weaponId: rewardWeapon,
          altBuff: rewardBuff,
          title: `二选一：${weaponName} / ${rewardBuff}`,
          acceptLabel: "选择武器",
          skipLabel: "选择增益",
          acceptText: `已选择武器并加入背包：${weaponName}。`,
          skipText: `已选择增益：${rewardBuff}。没有加入${weaponName}，本局仍保留圣剑榜资格。`,
        }
      );
      return;
    }

    grantBuff(game.player, rewardBuff);
    showClear("宝箱房", "宝箱打开了", `你获得了增益：${rewardBuff}。`);
  }

  function openSupplyRoom(roomKey) {
    if (game.completed[roomKey]) return;
    game.completed[roomKey] = true;
    const player = game.player;
    const reward = buffRewardIds[Math.floor(Math.random() * buffRewardIds.length)];
    grantBuff(player, reward);
    showClear("补给房", "补给到手", `你获得了「${reward}」。这间随机教室已完成。`);
  }

  function startRandomRoom(roomKey) {
    if (game.completed[roomKey]) return;
    const revealed = game.randomRooms[roomKey];
    if (revealed?.type === "monster") {
      startMonsterRoom(roomKey, revealed.room);
      return;
    }
    if (revealed?.type === "chest") {
      openChestRoom(roomKey);
      return;
    }
    if (revealed?.type === "supply") {
      openSupplyRoom(roomKey);
      return;
    }
    const roll = Math.random();
    if (roll < 0.5) {
      const enemy = pickRandomMonsterEnemy();
      const title = randomRoomTitle(roomKey);
      startMonsterRoom(roomKey, {
        completedKey: roomKey,
        title,
        label: `${title}：${enemy.name}`,
        rewardWeapon: enemy.rewardWeapon,
        rewardBuff: enemy.rewardBuff,
        clearTitle: `${enemy.name}被击败`,
        clearText: `你在随机教室中击败了${enemy.name}，奖励已加入背包。`,
        enemy,
      });
      if (game.pendingChallenge?.room) {
        game.randomRooms[roomKey] = { type: "monster", room: game.pendingChallenge.room };
      }
      return;
    }
    if (roll < 0.8) {
      game.randomRooms[roomKey] = { type: "chest" };
      openChestRoom(roomKey);
      return;
    }
    game.randomRooms[roomKey] = { type: "supply" };
    openSupplyRoom(roomKey);
  }

  function completedBossPrepCount() {
    return Object.values(game.completed).filter(Boolean).length;
  }

  function randomBossPrepCount() {
    return ["chest", "randomB", "randomC"].filter((key) => game.completed[key]).length;
  }

  function preparedCoreRoom(coreId) {
    return {
      cauchy: "monster",
      descartes: "geometry",
      gauss: "linear",
    }[coreId];
  }

  function isCorePrepared(coreId) {
    const roomKey = preparedCoreRoom(coreId);
    return Boolean(roomKey && game.completed[roomKey]);
  }

  function bossShieldForCore(coreId, direct) {
    const randomPrep = randomBossPrepCount();
    if (direct) return 72;
    if (isCorePrepared(coreId)) return 0;
    return Math.max(12, 38 - randomPrep * 8);
  }

  function bossInitialCoreHp(direct) {
    const baseHp = direct ? 360 : Number(baseStats.bossCoreHp || 300);
    if (direct) return baseHp;
    return Math.max(250, baseHp - completedBossPrepCount() * 8);
  }

  function startBossRoom() {
    mode = "combat";
    game.activeRoom = "boss";
    game.pendingChallenge = null;
    game.challengeCount = 1;
    game.defeatedInRoom = 0;
    game.player.x = W * 0.5;
    game.player.y = H * 0.78;
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    game.enemies = [];
    game.obstacles = [];
    const direct = !Object.values(game.completed).some(Boolean);
    awakenDirectBossSword(game.player, direct);
    const prepCount = completedBossPrepCount();
    const coreHp = bossInitialCoreHp(direct);
    game.boss = {
      name: "三位一体",
      x: W * 0.5,
      y: H * 0.31,
      moveBaseX: W * 0.5,
      moveT: 0,
      moveAmp: direct ? 82 : 68,
      moveSpeed: direct ? 0.72 : 0.56,
      angle: 0,
      rotateFrom: 0,
      rotateTo: 0,
      rotating: false,
      rotateElapsed: 0,
      rotateDuration: direct ? 0.58 : 0.72,
      rotateTimer: direct ? 2.0 : 2.35,
      rotateCooldown: direct ? 4.0 : 5.1,
      rotationSteps: 0,
      comboTimer: direct ? 2.9 : 3.4,
      comboCooldown: direct ? 8.4 : 10.6,
      comboWarning: 0,
      comboWarningTime: direct ? 0.75 : 0.95,
      comboType: "",
      comboCount: 0,
      laserCount: 0,
      shotPatternCounts: {},
      weakTimer: 0,
      weakCooldown: direct ? 5.4 : Math.max(4.8, 7.2 - prepCount * 0.24),
      weakDuration: direct ? 2.8 : Math.min(4.5, 3.4 + prepCount * 0.12),
      weakCoreId: "",
      weakCycle: 0,
      inheritedCoreIds: [],
      inheritedTimer: direct ? 3.3 : 4.2,
      inheritedCount: 0,
      obstacleTimer: direct ? 3.2 : Math.max(3.1, 5.0 - randomBossPrepCount() * 0.35),
      obstacleCooldown: direct ? 5.2 : Math.max(4.3, 7.2 - randomBossPrepCount() * 0.45),
      obstacleWarningTime: direct ? 1.25 : 1.55,
      obstacleBoomCount: 0,
      ultimate: {
        timer: direct ? 8.2 : Math.max(8.4, 10.8 - prepCount * 0.3),
        cooldown: direct ? 16.5 : Math.max(16.0, 22.0 - prepCount * 0.6),
        state: "idle",
        charge: 0,
        chargeTime: direct ? 3.0 : 3.45,
        damageTaken: 0,
        requiredPerCore: direct ? 88 : Math.max(58, 76 - prepCount * 2),
        count: 0,
        firedCount: 0,
        interruptedCount: 0,
        lastInterrupted: 0,
      },
      intro: {
        elapsed: 0,
        blackTime: 1,
        sceneFadeStart: 4,
        sceneFadeDuration: 2.2,
        titleFadeStart: 4,
        titleFadeDuration: 2.2,
        total: 6.25,
        coreLightTimes: [4.25, 4.85, 5.45],
      },
      phaseName: direct ? "裸考高压" : "三核展开",
      defeatedCount: 0,
      direct,
      cores: [
        {
          id: "cauchy",
          name: "柯西核心",
          symbol: "∫",
          kind: "calculus",
          hp: coreHp,
          maxHp: coreHp,
          shield: bossShieldForCore("cauchy", direct),
          maxShield: bossShieldForCore("cauchy", direct),
          prepared: isCorePrepared("cauchy"),
          color: colors.chalk,
          offset: 0,
          attack: "curve",
          fireEvery: direct ? 0.9 : 1.12,
          baseFireEvery: direct ? 0.9 : 1.12,
          fireTimer: 0.8,
        },
        {
          id: "descartes",
          name: "笛卡尔核心",
          symbol: "xy",
          kind: "geometry",
          hp: coreHp,
          maxHp: coreHp,
          shield: bossShieldForCore("descartes", direct),
          maxShield: bossShieldForCore("descartes", direct),
          prepared: isCorePrepared("descartes"),
          color: colors.cyan,
          offset: (Math.PI * 2) / 3,
          attack: "laser",
          fireEvery: direct ? 1.8 : 2.2,
          baseFireEvery: direct ? 1.8 : 2.2,
          fireTimer: 1.2,
        },
        {
          id: "gauss",
          name: "高斯核心",
          symbol: "A",
          kind: "linear",
          hp: coreHp,
          maxHp: coreHp,
          shield: bossShieldForCore("gauss", direct),
          maxShield: bossShieldForCore("gauss", direct),
          prepared: isCorePrepared("gauss"),
          color: colors.warning,
          offset: (Math.PI * 4) / 3,
          attack: "matrix",
          fireEvery: direct ? 1.45 : 1.75,
          baseFireEvery: direct ? 1.45 : 1.75,
          fireTimer: 1.45,
        },
      ],
    };
    game.obstacles = generateRoomObstacles("boss");
    showScreen("combat");
    updateHud();
  }

  function showClear(eyebrow, title, text, weaponChoice = null) {
    mode = "clear";
    game.pendingWeaponChoice = weaponChoice;
    ui.clearEyebrow.textContent = eyebrow;
    ui.clearTitle.textContent = title;
    ui.clearText.textContent = text;
    showScreen("clear");
    updateWeaponChoiceUi();
    updateHud();
  }

  function sanitizeLeaderboardName(value) {
    const cleaned = String(value ?? "")
      .replace(/[\u0000-\u001f\u007f<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return Array.from(cleaned || defaultLeaderboardName).slice(0, 12).join("");
  }

  function normalizeLeaderboardEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const score = Number(entry.score);
    if (!Number.isFinite(score) || score <= 0) return null;
    const seconds = Math.max(1, Math.round(Number(entry.seconds || entry.time || 0)));
    const playedAt = entry.playedAt || new Date().toISOString();
    const completedRooms = Array.isArray(entry.completedRooms)
      ? entry.completedRooms.filter(Boolean).slice(0, 6)
      : [];
    const weaponsFound = Math.max(1, Math.round(Number(entry.weaponsFound || 1)));
    const swordOnly = typeof entry.swordOnly === "boolean"
      ? entry.swordOnly
      : weaponsFound <= 1 && completedRooms.length === 0;
    return {
      id: String(entry.id || `${playedAt}-${score}`),
      name: sanitizeLeaderboardName(entry.name),
      score: Math.round(score),
      seconds,
      kills: Math.max(0, Math.round(Number(entry.kills || 0))),
      weaponsFound,
      hp: Math.max(0, Math.round(Number(entry.hp || 0))),
      maxHp: Math.max(1, Math.round(Number(entry.maxHp || 1))),
      completedRooms,
      swordOnly,
      playedAt,
    };
  }

  function dedupeLeaderboardEntries(entries) {
    const byId = new Map();
    entries
      .map(normalizeLeaderboardEntry)
      .filter(Boolean)
      .forEach((entry) => {
        const existing = byId.get(entry.id);
        if (existing && entry.name === defaultLeaderboardName && existing.name !== defaultLeaderboardName) {
          entry.name = existing.name;
        }
        byId.set(entry.id, entry);
      });
    return Array.from(byId.values());
  }

  function leaderboardTieBreak(a, b) {
    return new Date(a.playedAt) - new Date(b.playedAt);
  }

  function compareLeaderboardEntries(kind) {
    if (kind === "time") {
      return (a, b) => a.seconds - b.seconds || b.score - a.score || leaderboardTieBreak(a, b);
    }
    return (a, b) => b.score - a.score || a.seconds - b.seconds || leaderboardTieBreak(a, b);
  }

  function sortLeaderboard(entries, kind = "score") {
    const rows = dedupeLeaderboardEntries(entries);
    const filtered = kind === "sword" ? rows.filter((entry) => entry.swordOnly) : rows;
    return filtered.sort(compareLeaderboardEntries(kind)).slice(0, leaderboardLimit);
  }

  function leaderboardRankings(entries = readLeaderboard()) {
    return {
      score: sortLeaderboard(entries, "score"),
      time: sortLeaderboard(entries, "time"),
      sword: sortLeaderboard(entries, "sword"),
    };
  }

  function retainLeaderboardEntries(entries) {
    const unique = dedupeLeaderboardEntries(entries);
    const keep = new Map();
    Object.values(leaderboardRankings(unique)).flat().forEach((entry) => {
      keep.set(entry.id, entry);
    });
    return Array.from(keep.values()).sort(compareLeaderboardEntries("score"));
  }

  function readLeaderboard() {
    try {
      return retainLeaderboardEntries(JSON.parse(localStorage.getItem(leaderboardStorageKey) || "[]"));
    } catch {
      return [];
    }
  }

  function writeLeaderboard(entries) {
    const topTen = retainLeaderboardEntries(entries);
    try {
      localStorage.setItem(leaderboardStorageKey, JSON.stringify(topTen));
    } catch {
      // Ranking still renders for the current run even if browser storage is unavailable.
    }
    return topTen;
  }

  async function loadServerLeaderboard() {
    if (!window.fetch) return readLeaderboard();
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!response.ok) return readLeaderboard();
      const data = await response.json();
      const entries = retainLeaderboardEntries([...(data.entries || []), ...readLeaderboard()]);
      writeLeaderboard(entries);
      return entries;
    } catch {
      return readLeaderboard();
    }
  }

  function completedRoomNames() {
    const names = {
      monster: "微积分",
      chest: "随机 A",
      geometry: "欧氏几何",
      linear: "线性代数",
      randomB: "随机 B",
      randomC: "随机 C",
    };
    return Object.entries(game.completed)
      .filter(([key, done]) => done && names[key])
      .map(([key]) => names[key]);
  }

  function isSwordOnlyRun() {
    return !game.usedNonSwordWeapon && game.weaponsFound <= 1;
  }

  function calculateClearScore(seconds, player) {
    const roomCount = completedRoomNames().length;
    const hpRatio = clamp((player?.hp || 0) / Math.max(1, player?.maxHp || 1), 0, 1);
    const swordOnly = isSwordOnlyRun();
    const bossClear = 650;
    const roomScore = roomCount * 95;
    const killScore = Math.min(game.kills, 18) * 24;
    const weaponScore = Math.max(0, game.weaponsFound - 1) * 18;
    const hpScore = Math.round(hpRatio * 170);
    const speedScore = Math.max(0, Math.round(1980 - seconds * 5));
    const overtimePenalty = Math.max(0, Math.round((seconds - 360) * 5));
    const swordRouteBonus = swordOnly ? 520 : 0;
    const swordSpeedBonus = swordOnly ? Math.max(0, Math.round(560 - seconds * 1.4)) : 0;
    const swordDirectBonus = swordOnly && roomCount === 0 ? 180 : 0;
    const swordBonus = swordRouteBonus + swordSpeedBonus + swordDirectBonus;
    const score = Math.max(1, Math.round(
      bossClear + roomScore + killScore + weaponScore + hpScore + speedScore + swordBonus - overtimePenalty
    ));
    return {
      score,
      roomCount,
      bossClear,
      roomScore,
      killScore,
      weaponScore,
      hpScore,
      speedScore,
      overtimePenalty,
      swordBonus,
      swordOnly,
    };
  }

  function makeLeaderboardEntry(score, seconds, scoreDetails = null) {
    const player = game.player;
    return {
      id: `${Date.now()}-${Math.round(score)}`,
      name: defaultLeaderboardName,
      score,
      seconds,
      kills: game.kills,
      weaponsFound: game.weaponsFound,
      hp: Math.max(0, Math.ceil(player.hp)),
      maxHp: player.maxHp,
      completedRooms: completedRoomNames(),
      swordOnly: scoreDetails?.swordOnly ?? isSwordOnlyRun(),
      playedAt: new Date().toISOString(),
    };
  }

  function saveLeaderboardEntry(entry) {
    const normalized = normalizeLeaderboardEntry(entry);
    if (!normalized) return readLeaderboard();
    const updated = writeLeaderboard([
      ...readLeaderboard().filter((item) => item.id !== normalized.id),
      normalized,
    ]);
    syncLeaderboardToServer(normalized);
    return updated;
  }

  function syncLeaderboardToServer(entry) {
    if (!window.fetch) return;
    fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.entries) writeLeaderboard([...data.entries, ...readLeaderboard()]);
      })
      .catch(() => {
      // Local ranking is the source of truth for the playable prototype.
      });
  }

  function leaderboardRanksForEntry(entry, entries = readLeaderboard()) {
    const normalized = normalizeLeaderboardEntry(entry);
    if (!normalized) return [];
    const rankings = leaderboardRankings(entries);
    return [
      ["score", "积分榜"],
      ["time", "竞速榜"],
      ["sword", "圣剑榜"],
    ]
      .map(([kind, label]) => ({
        kind,
        label,
        rank: rankings[kind].findIndex((item) => item.id === normalized.id) + 1,
      }))
      .filter((item) => item.rank > 0);
  }

  function leaderboardRankText(ranks) {
    return ranks.map((item) => `${item.label}第 ${item.rank} 名`).join("、");
  }

  function refreshOpenLeaderboardModal() {
    if (!ui.modal.hidden && ui.modal.dataset.kind === "leaderboard") {
      ui.modalBody.innerHTML = leaderboardMarkup();
    }
  }

  function hideLeaderboardNameForm() {
    game.pendingLeaderboardEntry = null;
    if (ui.leaderboardNameForm) ui.leaderboardNameForm.hidden = true;
    if (ui.leaderboardNameInput) ui.leaderboardNameInput.value = "";
    if (ui.leaderboardNameStatus) ui.leaderboardNameStatus.textContent = "";
    if (ui.leaderboardNameSubmit) ui.leaderboardNameSubmit.textContent = "提交";
  }

  function showLeaderboardNameForm(entry, ranks) {
    game.pendingLeaderboardEntry = { ...entry };
    if (!ui.leaderboardNameForm) return;
    ui.leaderboardNameForm.hidden = false;
    if (ui.leaderboardNameInput) {
      ui.leaderboardNameInput.value = entry.name === defaultLeaderboardName ? "" : entry.name;
      ui.leaderboardNameInput.placeholder = defaultLeaderboardName;
      window.setTimeout(() => ui.leaderboardNameInput?.focus(), 0);
    }
    if (ui.leaderboardNameStatus) {
      ui.leaderboardNameStatus.textContent = `本局进入${leaderboardRankText(ranks)}，可以留下名字。`;
    }
    if (ui.leaderboardNameSubmit) ui.leaderboardNameSubmit.textContent = "提交";
  }

  function submitLeaderboardName(event) {
    event?.preventDefault();
    if (!game.pendingLeaderboardEntry) return;
    const namedEntry = {
      ...game.pendingLeaderboardEntry,
      name: sanitizeLeaderboardName(ui.leaderboardNameInput?.value),
    };
    const updated = saveLeaderboardEntry(namedEntry);
    const ranks = leaderboardRanksForEntry(namedEntry, updated);
    game.pendingLeaderboardEntry = namedEntry;
    if (ui.leaderboardNameInput) ui.leaderboardNameInput.value = namedEntry.name;
    if (ui.leaderboardNameStatus) {
      ui.leaderboardNameStatus.textContent = ranks.length
        ? `已记录：${namedEntry.name}，当前${leaderboardRankText(ranks)}。`
        : `已记录：${namedEntry.name}。`;
    }
    if (ui.leaderboardNameSubmit) ui.leaderboardNameSubmit.textContent = "更新";
    refreshOpenLeaderboardModal();
  }

  function finishGame(win) {
    mode = "result";
    const player = game.player;
    const seconds = Math.max(1, Math.round(game.elapsed / 1000));
    const scoreDetails = win ? calculateClearScore(seconds, player) : null;
    const score = win
      ? scoreDetails.score
      : Math.max(0, game.kills * 80 + Math.max(0, game.weaponsFound - 1) * 25 - seconds * 2);
    const speedText = scoreDetails
      ? `+${scoreDetails.speedScore}${scoreDetails.overtimePenalty ? ` / 超时 -${scoreDetails.overtimePenalty}` : ""}`
      : "-";
    ui.resultEyebrow.textContent = win ? "绩点保住了" : "期末结算";
    ui.resultTitle.textContent = win ? "恭喜通过期末考试！" : "很遗憾，你挂科了。";
    ui.resultStats.innerHTML = [
      ["击败小怪", `${game.kills}`],
      ["完成房间", `${scoreDetails?.roomCount ?? completedRoomNames().length} / 6`],
      ["剩余生命", `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`],
      ["通关时间", `${seconds} 秒`],
      ["速度修正", speedText],
      ["圣剑通关", scoreDetails?.swordOnly ? "是" : "否"],
      ["圣剑奖励", scoreDetails?.swordOnly ? `+${scoreDetails.swordBonus}` : "-"],
      ["最终评分", `${score}`],
      ["绩点状态", win ? "保住了" : "重修预警"],
    ]
      .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
      .join("");
    hideLeaderboardNameForm();
    if (win) {
      const entry = makeLeaderboardEntry(score, seconds, scoreDetails);
      const updated = saveLeaderboardEntry(entry);
      const ranks = leaderboardRanksForEntry(entry, updated);
      if (ranks.length) showLeaderboardNameForm(entry, ranks);
    }
    showScreen("result");
  }

  function update(dt) {
    if (mode === "map") {
      if (ui.modal.hidden) {
        updateMapPlayer(dt);
      }
      return;
    }
    if (mode !== "combat" || !ui.modal.hidden) {
      return;
    }

    game.elapsed = performance.now() - game.startedAt;
    const player = game.player;
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.dashCooldown = Math.max(0, (player.dashCooldown || 0) - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.mistakeBoostTimer = Math.max(0, (player.mistakeBoostTimer || 0) - dt);
    updateWeaponReloads(dt);
    updatePassiveShield(dt);

    const bossIntroActive = isBossIntroActive();
    if (!bossIntroActive) {
      updatePlayer(dt);
      if (attackHeld || mouse.down) {
        tryAttack();
      }
    }

    if (game.activeRoom === "monster") {
      updateMonsterRoom(dt);
    } else if (game.activeRoom === "boss") {
      updateBoss(dt);
    }

    if (!bossIntroActive) {
      updateProjectiles(dt);
      updateLasers(dt);
      updateSlashes(dt);
      checkPlayerHits();
    }
    updateParticles(dt);
    updateHud();

    if (player.hp <= 0) {
      finishGame(false);
    }
  }

  function movementSpeedMultiplier(player) {
    return hasBuff(player, "熬夜咖啡") ? 2 : 1;
  }

  function updatePlayer(dt) {
    const player = game.player;
    let dx = 0;
    let dy = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    const speed = player.speed * movementSpeedMultiplier(player);
    player.x = clamp(player.x + (dx / len) * speed * dt * 60, arena.left + 4, arena.right - 4);
    player.y = clamp(player.y + (dy / len) * speed * dt * 60, arena.top + 8, arena.bottom - 4);
    resolvePlayerObstacles();
  }

  function movementVector() {
    const dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    const len = Math.hypot(dx, dy);
    return len ? { x: dx / len, y: dy / len } : null;
  }

  function dashCombatPlayer() {
    const player = game.player;
    if (!player || mode !== "combat" || isBossIntroActive() || (player.dashCooldown || 0) > 0) return false;
    const moveDir = movementVector();
    const aimAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const dir = moveDir || { x: Math.cos(aimAngle), y: Math.sin(aimAngle) };
    const from = { x: player.x, y: player.y };
    const distanceValue = 92;
    player.x = clamp(player.x + dir.x * distanceValue, arena.left + 4, arena.right - 4);
    player.y = clamp(player.y + dir.y * distanceValue, arena.top + 8, arena.bottom - 4);
    resolvePlayerObstacles();
    player.dashCooldown = 0.72;
    player.invuln = Math.max(player.invuln, 0.22);
    burst(from.x, from.y, colors.paper, 10);
    burst(player.x, player.y, colors.cyan, 8);
    updateHud();
    return true;
  }

  function tryAttack() {
    const player = game.player;
    if (player.attackTimer > 0) return;

    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const weapon = player.weapon;
    if (weapon.id !== "sword") {
      game.usedNonSwordWeapon = true;
    }
    if (!weapon.infiniteAmmo) {
      if (weapon.reloading) return;
      if (weapon.ammo <= 0) {
        startReload(weapon);
        return;
      }
    }
    player.attackTimer = weapon.cooldown;
    const attackKind = weapon.kind;
    const damageMultiplier =
      weaponDamageScale(weapon) *
      (hasBuff(player, "学霸笔记") ? 1.1 : 1) *
      (hasBuff(player, "公式大全") ? 1.1 : 1) *
      (player.mistakeBoostTimer > 0 ? 1.25 : 1);

    if (!weapon.ranged) {
      if (weapon.special === "crossSlash") {
        const reach = weapon.slashReach || 36;
        const radius = weapon.slashRadius || 52;
        [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((slashAngle) => {
          game.slashes.push({
            x: player.x + Math.cos(slashAngle) * reach,
            y: player.y + Math.sin(slashAngle) * reach,
            r: radius,
            angle: slashAngle,
            life: 0.18,
            maxLife: 0.18,
            damage: weapon.damage * damageMultiplier,
            color: weapon.color || colors.cyan,
            kind: attackKind,
            hitIds: new Set(),
            originX: player.x,
            originY: player.y,
          });
        });
        return;
      }
      if (weapon.special === "shieldPulse") {
        const shieldBonus = Math.max(0, (weapon.level || 1) - 1);
        const shieldValue = Math.round((weapon.shieldValue || 40) * (1 + shieldBonus * 0.12));
        const pulseRadius = weapon.pulseRadius || 72;
        const shotClearRadius = weapon.shotClearRadius || 90;
        player.shield = Math.max(player.shield || 0, shieldValue);
        game.enemyShots = game.enemyShots.filter((shot) => distance(player, shot) > shotClearRadius);
        game.slashes.push({
          x: player.x,
          y: player.y,
          r: pulseRadius,
          angle,
          life: 0.22,
          maxLife: 0.22,
          damage: weapon.damage * damageMultiplier,
          color: weapon.color || colors.cyan,
          kind: attackKind,
          hitIds: new Set(),
          originX: player.x,
          originY: player.y,
        });
        return;
      }
      const reach = weapon.slashReach || swordSlashReach;
      const radius = weapon.slashRadius || swordSlashRadius;
      game.slashes.push({
        x: player.x + Math.cos(angle) * reach,
        y: player.y + Math.sin(angle) * reach,
        r: radius,
        angle,
        life: 0.16,
        maxLife: 0.16,
        damage: weapon.damage * damageMultiplier,
        color: weapon.color || colors.mint,
        kind: attackKind,
        hitIds: new Set(),
        originX: player.x,
        originY: player.y,
      });
      return;
    }

    const pellets = weapon.pellets || 1;
    const spread = weapon.spread || 0;
    const speed = weapon.speed || 540;
    for (let i = 0; i < pellets; i += 1) {
      const offset = pellets === 1 ? 0 : (i - (pellets - 1) / 2) * (spread / Math.max(1, pellets - 1));
      const shotAngle = angle + offset;
      game.playerShots.push({
        x: player.x + Math.cos(shotAngle) * 20,
        y: player.y + Math.sin(shotAngle) * 20,
        r: weapon.projectileRadius || 5,
        vx: Math.cos(shotAngle) * speed,
        vy: Math.sin(shotAngle) * speed,
        damage: weapon.damage * damageMultiplier,
        kind: attackKind,
        color: weapon.color || colors.mint,
        angle: shotAngle,
        pierce: weapon.pierce || 1,
        blastRadius: weapon.blastRadius || 0,
        beamLength: weapon.beamLength || 0,
        shape: weapon.shape || "circle",
        splitAfter: weapon.splitAfter || 0,
        splitCount: weapon.splitCount || 0,
        splitSpread: weapon.splitSpread || 0,
        splitDamage: weapon.splitDamage || 0.5,
        splitSpeed: weapon.splitSpeed || speed,
        splitPattern: weapon.splitPattern || "",
        hitIds: new Set(),
        life: weapon.id.includes("Rpg") ? 1.75 : 1.4,
      });
    }
    if (!weapon.infiniteAmmo) {
      weapon.ammo = Math.max(0, weapon.ammo - 1);
      if (weapon.ammo === 0) {
        startReload(weapon);
      }
    }
  }

  function updateMonsterRoom(dt) {
    if (!game.enemies.length) return;

    game.enemies.forEach((enemy) => {
      if (enemy.defeated) return;
      enemy.moveT += dt;
      const previousX = enemy.x;
      const previousY = enemy.y;
      enemy.x = enemy.baseX + Math.sin(enemy.moveT * enemy.moveSpeed) * enemy.moveAmp;
      enemy.y = enemy.baseY + Math.cos(enemy.moveT * enemy.moveSpeed * 0.7) * 18;
      updateEnemyFacing(enemy, previousX, previousY);
      enemy.backHitFlash = Math.max(0, (enemy.backHitFlash || 0) - dt);
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        enemy.fireTimer = enemy.fireEvery;
        fireEnemyPattern(enemy);
      }

      applyPlayerDamageToCircle(enemy, "enemy");
      if (enemy.hp <= 0) {
        enemy.defeated = true;
        game.kills += 1;
        game.defeatedInRoom += 1;
        burst(enemy.x, enemy.y, enemy.color, 28);
      }
    });

    game.enemies = game.enemies.filter((enemy) => !enemy.defeated);
    if (!game.enemies.length) {
      completeMonsterChallenge();
    }
  }

  function completeMonsterChallenge() {
    if (!game.activeRoomKey || game.completed[game.activeRoomKey]) return;
    const reward = game.roomReward || {};
    const player = game.player;
    const count = clamp(game.challengeCount || 1, 1, 3);
    const grantedBuffs = [];
    let weaponName = "";
    let weaponAction = "获得正常版武器";

    game.completed[game.activeRoomKey] = true;

    if (reward.weapon) {
      const equivalentIds = weaponFamilyIds(reward.weapon);
      const existingWeapon = player.weapons.find((weapon) => equivalentIds.includes(weapon.id));
      if (existingWeapon) {
        weaponAction = "强化重复武器";
      }
      weaponName = weaponChoiceName(reward.weapon);
    }

    if (count >= 2 && reward.buff) {
      grantBuff(player, reward.buff);
      grantedBuffs.push(reward.buff);
    }
    if (count >= 3) {
      const extraBuff = pickChallengeBuff(grantedBuffs);
      grantBuff(player, extraBuff);
      grantedBuffs.push(extraBuff);
    }

    const weaponText = weaponName ? `${weaponAction}：${weaponName}` : "获得战斗奖励";
    const buffText = grantedBuffs.length ? `，并获得增益：${grantedBuffs.join("、")}` : "";
    const clearText = `挑战 ${count} 人完成，${weaponText}${buffText}。${weaponName ? "是否加入背包？" : ""}`;
    const rewardSuffix = grantedBuffs.length ? ` 增益已获得：${grantedBuffs.join("、")}。` : "";
    showClear(
      reward.clearEyebrow || "怪物房",
      reward.clearTitle || "知识投影被击败",
      clearText,
      weaponName
        ? {
          weaponId: reward.weapon,
          acceptText: `已加入背包：${weaponName}。`,
          skipText: `没有加入${weaponName}，本局仍保留圣剑榜资格。${rewardSuffix}`,
          rewardSuffix,
        }
        : null
    );
  }

  function updateEnemyFacing(enemy, previousX, previousY) {
    const dx = enemy.x - previousX;
    const dy = enemy.y - previousY;
    if (Math.hypot(dx, dy) > 0.08) {
      const targetAngle = Math.atan2(dy, dx);
      enemy.facingAngle = smoothAngle(enemy.facingAngle ?? targetAngle, targetAngle, 0.18);
    }
  }

  function pickChallengeBuff(excluded = []) {
    const options = ["学霸笔记", "公式大全", "熬夜咖啡", "草稿纸护盾", "错题本", "绩点守护", "临时抱佛脚"];
    const available = options.filter((name) => !excluded.includes(name));
    const source = available.length ? available : options;
    return source[Math.floor(Math.random() * source.length)];
  }

  function fireEnemyPattern(enemy) {
    const baseAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
    if (enemy.pattern === "cross") {
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
        spawnEnemyShot(enemy.x, enemy.y, angle, 185, 10, enemy.color);
      });
      spawnEnemyShot(enemy.x, enemy.y, baseAngle, 210, 10, enemy.color);
      return;
    }
    if (enemy.pattern === "wall") {
      const sideX = -Math.sin(baseAngle);
      const sideY = Math.cos(baseAngle);
      for (let i = -2; i <= 2; i += 1) {
        spawnEnemyShot(enemy.x + sideX * i * 24, enemy.y + sideY * i * 24, baseAngle, 150 + Math.abs(i) * 12, 10, enemy.color);
      }
      return;
    }
    if (enemy.pattern === "matrix") {
      const forwardX = Math.cos(baseAngle);
      const forwardY = Math.sin(baseAngle);
      const sideX = -forwardY;
      const sideY = forwardX;
      for (let row = 0; row < 2; row += 1) {
        for (let col = -1; col <= 1; col += 1) {
          const startX = enemy.x - forwardX * row * 22 + sideX * col * 24;
          const startY = enemy.y - forwardY * row * 22 + sideY * col * 24;
          spawnEnemyShot(startX, startY, baseAngle, 145 + row * 18, 10, enemy.color, {
            pattern: "matrix",
            shape: "square",
            r: 7,
            pulse: row * 0.2 + col * 0.08,
          });
        }
      }
      return;
    }
    if (enemy.pattern === "circle") {
      for (let i = 0; i < 10; i += 1) {
        spawnEnemyShot(enemy.x, enemy.y, (Math.PI * 2 * i) / 10 + enemy.moveT * 0.2, 145, 10, enemy.color);
      }
      return;
    }
    if (enemy.pattern === "triangle") {
      for (let i = 0; i < 3; i += 1) {
        spawnEnemyShot(enemy.x, enemy.y, baseAngle + (i - 1) * 0.34, 165, 10, enemy.color, {
          shape: "square",
          r: 7,
          pulse: i * 0.18,
        });
      }
      for (let i = 0; i < 3; i += 1) {
        spawnEnemyShot(enemy.x, enemy.y, (Math.PI * 2 * i) / 3 + enemy.moveT * 0.18, 125, 8, enemy.color);
      }
      return;
    }
    if (enemy.pattern === "split") {
      for (let i = -2; i <= 2; i += 1) {
        spawnEnemyShot(enemy.x, enemy.y, baseAngle + i * 0.18, 160 + Math.abs(i) * 14, 10, enemy.color);
      }
      return;
    }
    if (enemy.pattern === "aimed") {
      spawnEnemyShot(enemy.x, enemy.y, baseAngle, 235, 12, enemy.color, { r: 7, label: "!" });
      for (let i = -1; i <= 1; i += 2) {
        spawnEnemyShot(enemy.x, enemy.y, baseAngle + i * 0.16, 185, 9, enemy.color);
      }
      return;
    }
    for (let i = -1; i <= 1; i += 1) {
      spawnEnemyShot(enemy.x, enemy.y, baseAngle + i * 0.22, 170, 10, enemy.color);
    }
  }

  function updateBoss(dt) {
    const boss = game.boss;
    if (!boss) return;

    advanceBossIntro(boss, dt);
    updateBossDeaths(boss);
    updateBossMovement(boss, dt);

    const aliveCores = boss.cores.filter((core) => core.hp > 0);
    const activeCores = bossActiveCores(boss, aliveCores);
    boss.cores.forEach((core) => {
      core.hitFlash = Math.max(0, (core.hitFlash || 0) - dt);
      core.guardFlash = Math.max(0, (core.guardFlash || 0) - dt);
    });
    if (!aliveCores.length) {
      finishGame(true);
      return;
    }

    updateBossObstacles(boss, dt);
    updateBossWeakness(boss, activeCores, dt);
    updateBossUltimate(boss, activeCores, dt);
    updateBossInheritedAttacks(boss, activeCores, dt);

    const ultimateCharging = isBossUltimateCharging(boss);
    if (!ultimateCharging) {
      updateBossRotation(boss, dt);
      updateBossCombo(boss, activeCores, dt);
    }

    const attackingPaused = isBossIntroActive() || boss.rotating || boss.comboWarning > 0 || ultimateCharging;
    if (!attackingPaused) {
      activeCores.forEach((core) => {
        core.fireTimer -= dt;
        if (core.fireTimer <= 0) {
          fireBossCore(core);
          core.fireTimer = bossCoreInterval(core);
        }
      });
    }

    boss.cores.forEach((core) => {
      if (core.hp <= 0) return;
      const pos = corePosition(core);
      applyPlayerDamageToCircle({ ...core, x: pos.x, y: pos.y, r: 25 }, "boss", core);
    });
    updateBossDeaths(boss);
  }

  function advanceBossIntro(boss, dt) {
    if (!boss.intro || boss.intro.elapsed >= boss.intro.total) return;
    boss.intro.elapsed = Math.min(boss.intro.total, boss.intro.elapsed + dt);
  }

  function isBossIntroActive() {
    const boss = game.boss;
    return game.activeRoom === "boss" && Boolean(boss?.intro) && boss.intro.elapsed < boss.intro.total;
  }

  function isBossUltimateCharging(boss = game.boss) {
    return Boolean(boss?.ultimate && boss.ultimate.state === "charging");
  }

  function updateBossMovement(boss, dt) {
    if (isBossIntroActive()) return;
    boss.moveT = (boss.moveT || 0) + dt;
    const offset = Math.sin(boss.moveT * boss.moveSpeed) * boss.moveAmp;
    boss.x = clamp(boss.moveBaseX + offset, arena.left + 180, arena.right - 180);
  }

  function bossCoreById(id) {
    return game.boss?.cores.find((core) => core.id === id);
  }

  function bossFrontCoreIds(boss = game.boss) {
    if (!boss) return [];
    return boss.cores
      .map((core) => ({ core, pos: corePosition(core) }))
      .sort((a, b) => b.pos.y - a.pos.y)
      .slice(0, 2)
      .map((item) => item.core.id);
  }

  function isBossCoreFront(core, boss = game.boss) {
    if (!boss || !core || core.hp <= 0) return false;
    return bossFrontCoreIds(boss).includes(core.id);
  }

  function bossActiveCores(boss = game.boss, cores = null) {
    const source = cores || boss?.cores || [];
    const frontIds = new Set(bossFrontCoreIds(boss));
    return source.filter((core) => core.hp > 0 && frontIds.has(core.id));
  }

  function updateBossWeakness(boss, aliveCores, dt) {
    if (isBossIntroActive() || isBossUltimateCharging(boss) || boss.rotating || !aliveCores.length) return;
    if (boss.weakCoreId && !aliveCores.some((core) => core.id === boss.weakCoreId)) {
      boss.weakCoreId = "";
      boss.weakTimer = 0;
      boss.weakCooldown = Math.min(boss.weakCooldown, 1.2);
    }
    if (boss.weakTimer > 0) {
      boss.weakTimer = Math.max(0, boss.weakTimer - dt);
      if (boss.weakTimer === 0) {
        boss.weakCoreId = "";
        boss.weakCooldown = boss.direct ? 5.4 : Math.max(4.8, 7.2 - completedBossPrepCount() * 0.24);
      }
      return;
    }

    boss.weakCooldown -= dt;
    if (boss.weakCooldown <= 0) {
      const target = aliveCores[boss.weakCycle % aliveCores.length];
      boss.weakCycle += 1;
      boss.weakCoreId = target.id;
      boss.weakTimer = boss.weakDuration;
    }
  }

  function updateBossUltimate(boss, aliveCores, dt) {
    const ultimate = boss.ultimate;
    if (!ultimate || isBossIntroActive()) return;

    if (ultimate.state === "charging") {
      if (!aliveCores.length) {
        ultimate.state = "idle";
        ultimate.charge = 0;
        ultimate.timer = Math.min(ultimate.cooldown, 2.2);
        ultimate.interruptedCount += 1;
        return;
      }
      ultimate.charge = Math.min(ultimate.chargeTime, ultimate.charge + dt);
      if (ultimate.charge >= ultimate.chargeTime) {
        finishBossUltimate(boss, aliveCores);
      }
      return;
    }

    if (!aliveCores.length) return;
    if (boss.rotating || boss.comboWarning > 0) return;
    ultimate.timer -= dt;
    if (ultimate.timer <= 0) {
      beginBossUltimate(boss, aliveCores);
    }
  }

  function beginBossUltimate(boss, aliveCores) {
    const ultimate = boss.ultimate;
    ultimate.state = "charging";
    ultimate.charge = 0;
    ultimate.damageTaken = 0;
    ultimate.count += 1;
    boss.comboWarning = 0;
    boss.comboTimer = Math.max(boss.comboTimer, 1.8);
    aliveCores.forEach((core) => {
      core.fireTimer = Math.max(core.fireTimer, ultimate.chargeTime + 0.2);
    });
  }

  function finishBossUltimate(boss, aliveCores) {
    const ultimate = boss.ultimate;
    const interrupted = clamp(Math.floor(ultimate.damageTaken / ultimate.requiredPerCore), 0, aliveCores.length);
    const power = aliveCores.length - interrupted;
    ultimate.lastInterrupted = interrupted;
    ultimate.state = "idle";
    ultimate.charge = 0;
    ultimate.timer = ultimate.cooldown * bossPhaseMultiplier();

    if (power <= 0) {
      ultimate.interruptedCount += 1;
      aliveCores.forEach((core) => {
        core.fireTimer = Math.max(core.fireTimer, 1.2);
        const pos = corePosition(core);
        burst(pos.x, pos.y, colors.paper, 24);
      });
      return;
    }

    ultimate.firedCount += 1;
    fireBossUltimate(aliveCores, power);
  }

  function fireBossUltimate(aliveCores, power) {
    const boss = game.boss;
    if (!boss) return;
    const firingCores = aliveCores.slice(0, power);
    firingCores.forEach((core) => fireBossCore(core));

    const centerAngle = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
    const ringCount = 8 + power * 4;
    for (let i = 0; i < ringCount; i += 1) {
      const angle = centerAngle + (Math.PI * 2 * i) / ringCount;
      spawnEnemyShot(boss.x, boss.y, angle, 132 + power * 16, 11 + power, colors.paper, {
        pattern: power >= 3 && i % 2 === 0 ? "spiral" : "straight",
        curveAmp: power >= 3 ? 34 : 0,
        curveFreq: 3.6,
        curvePhase: i * 0.45,
        side: i % 2 ? 1 : -1,
        r: 4 + power,
        life: 4,
      });
    }

    if (power >= 2) {
      const snapX = clamp(game.player.x, arena.left + 82, arena.right - 82);
      const snapY = clamp(game.player.y, arena.top + 56, arena.bottom - 44);
      spawnEnemyLaser({
        orientation: "vertical",
        x: snapX,
        warningTime: 0.72,
        activeTime: 0.32,
        width: 18,
        damage: 18,
        color: colors.paper,
        sourceX: boss.x,
        sourceY: boss.y,
      });
      spawnEnemyLaser({
        orientation: "horizontal",
        y: snapY,
        warningTime: 0.72,
        activeTime: 0.32,
        width: 18,
        damage: 18,
        color: colors.paper,
        sourceX: boss.x,
        sourceY: boss.y,
      });
    }

    if (power >= 3) {
      for (let col = -2; col <= 2; col += 1) {
        spawnEnemyShot(boss.x + col * 34, arena.top + 18, Math.PI / 2, 128, 12, colors.warning, {
          pattern: "matrix",
          shape: "square",
          r: 8,
          life: 4.6,
        });
      }
    }
  }

  function updateBossInheritedAttacks(boss, aliveCores, dt) {
    if (isBossIntroActive() || isBossUltimateCharging(boss) || boss.comboWarning > 0 || !aliveCores.length || !boss.inheritedCoreIds.length) return;
    boss.inheritedTimer -= dt;
    if (boss.inheritedTimer > 0) return;
    boss.inheritedCoreIds.forEach((id, index) => {
      const source = aliveCores[index % aliveCores.length];
      fireInheritedMechanism(id, corePosition(source));
    });
    boss.inheritedCount += boss.inheritedCoreIds.length;
    boss.inheritedTimer = (boss.direct ? 4.0 : 5.2) * bossPhaseMultiplier();
  }

  function fireInheritedMechanism(id, pos) {
    const inherited = bossCoreById(id);
    const color = inherited?.color || colors.paper;
    const angle = Math.atan2(game.player.y - pos.y, game.player.x - pos.x);

    if (id === "cauchy") {
      [-0.22, 0.22].forEach((offset, index) => {
        spawnEnemyShot(pos.x, pos.y, angle + offset, 132, 9, color, {
          pattern: "curve",
          curveAmp: 70,
          curveFreq: 4.4,
          curvePhase: index * Math.PI,
          side: index ? 1 : -1,
          r: 4,
          life: 3.4,
        });
      });
      return;
    }

    if (id === "descartes") {
      const vertical = Math.abs(game.player.x - pos.x) > Math.abs(game.player.y - pos.y);
      spawnEnemyLaser({
        orientation: vertical ? "vertical" : "horizontal",
        x: vertical ? clamp(game.player.x, arena.left + 72, arena.right - 72) : 0,
        y: vertical ? 0 : clamp(game.player.y, arena.top + 48, arena.bottom - 38),
        warningTime: 0.58,
        activeTime: 0.28,
        width: 15,
        damage: 13,
        color,
        sourceX: pos.x,
        sourceY: pos.y,
      });
      return;
    }

    if (id === "gauss") {
      const sideX = -Math.sin(angle);
      const sideY = Math.cos(angle);
      for (let col = -1; col <= 1; col += 1) {
        spawnEnemyShot(pos.x + sideX * col * 26, pos.y + sideY * col * 26, angle, 122, 10, color, {
          pattern: "matrix",
          shape: "square",
          r: 7,
          life: 3.8,
        });
      }
    }
  }

  function updateBossObstacles(boss, dt) {
    if (!game.obstacles.length) return;

    game.obstacles.forEach((obstacle) => {
      if (obstacle.marked) {
        obstacle.markTimer = Math.max(0, obstacle.markTimer - dt);
        if (obstacle.markTimer === 0) {
          detonateBossObstacle(obstacle);
        }
      }
      if (obstacle.broken) {
        obstacle.restoreTimer = Math.max(0, obstacle.restoreTimer - dt);
        if (obstacle.restoreTimer === 0) {
          respawnBossObstacle(obstacle);
        }
      }
    });

    if (isBossIntroActive() || isBossUltimateCharging(boss)) return;
    boss.obstacleTimer -= dt;
    if (boss.obstacleTimer > 0) return;
    const available = game.obstacles.filter((obstacle) => !obstacle.marked && !obstacle.broken);
    if (!available.length) {
      boss.obstacleTimer = 1.2;
      return;
    }

    const markCount = Math.min(available.length, boss.direct || boss.defeatedCount >= 1 ? 2 : 1);
    for (let i = 0; i < markCount; i += 1) {
      const index = Math.floor(Math.random() * available.length);
      const obstacle = available.splice(index, 1)[0];
      obstacle.marked = true;
      obstacle.markTimer = boss.obstacleWarningTime;
      obstacle.maxMarkTimer = boss.obstacleWarningTime;
    }
    boss.obstacleTimer = boss.obstacleCooldown * bossPhaseMultiplier();
  }

  function respawnBossObstacle(obstacle) {
    const replacement = createRoomObstacle("boss", game.obstacles, obstacle);
    if (replacement) {
      Object.assign(obstacle, replacement);
    }
    obstacle.marked = false;
    obstacle.broken = false;
    obstacle.restoreTimer = 0;
    obstacle.markTimer = 0;
    obstacle.maxMarkTimer = 0;
  }

  function detonateBossObstacle(obstacle) {
    const center = obstacleCenter(obstacle);
    const radius = 82;
    obstacle.marked = false;
    obstacle.broken = true;
    obstacle.restoreTimer = 3.8;
    game.boss.obstacleBoomCount += 1;
    burst(center.x, center.y, colors.warning, 28);
    game.enemyShots = game.enemyShots.filter((shot) => distance(center, shot) > radius);
    game.playerShots = game.playerShots.filter((shot) => distance(center, shot) > radius * 0.72);
    if (game.player && distance(center, game.player) <= radius + game.player.r && game.player.invuln <= 0) {
      applyPlayerDamage(scaledIncomingDamage(16), colors.warning);
      game.player.invuln = Math.max(game.player.invuln, 0.72);
    }
  }

  function updateBossRotation(boss, dt) {
    if (boss.rotating) {
      boss.rotateElapsed += dt;
      const progress = clamp(boss.rotateElapsed / boss.rotateDuration, 0, 1);
      boss.angle = boss.rotateFrom + (boss.rotateTo - boss.rotateFrom) * easeInOut(progress);
      if (progress >= 1) {
        boss.angle = boss.rotateTo;
        boss.rotating = false;
        boss.rotationSteps += 1;
        boss.rotateTimer = boss.rotateCooldown * bossPhaseMultiplier();
        bossActiveCores(boss).forEach((core) => {
          core.fireTimer = Math.min(core.fireTimer, 0.24);
        });
      }
      return;
    }

    if (isBossIntroActive()) return;
    boss.rotateTimer -= dt;
    if (boss.rotateTimer <= 0) {
      boss.rotating = true;
      boss.rotateElapsed = 0;
      boss.rotateFrom = boss.angle;
      boss.rotateTo = boss.angle + (Math.PI * 2) / 3;
    }
  }

  function updateBossCombo(boss, aliveCores, dt) {
    if (isBossIntroActive() || boss.rotating || aliveCores.length < 2) return;

    if (boss.comboWarning > 0) {
      boss.comboWarning = Math.max(0, boss.comboWarning - dt);
      if (boss.comboWarning === 0) {
        fireBossCombo(aliveCores);
        boss.comboTimer = boss.comboCooldown * bossPhaseMultiplier();
      }
      return;
    }

    boss.comboTimer -= dt;
    if (boss.comboTimer <= 0) {
      boss.comboType = bossComboType(aliveCores);
      boss.comboWarning = boss.comboWarningTime;
    }
  }

  function bossComboType(aliveCores) {
    const ids = new Set(aliveCores.map((core) => core.id));
    if (ids.size >= 3) return "trinity";
    if (ids.has("cauchy") && ids.has("descartes")) return "curve_laser";
    if (ids.has("descartes") && ids.has("gauss")) return "grid_lock";
    if (ids.has("gauss") && ids.has("cauchy")) return "matrix_spiral";
    return "single";
  }

  function updateBossDeaths(boss) {
    boss.cores.forEach((core) => {
      if (core.hp <= 0 && !core.defeated) {
        core.hp = 0;
        core.defeated = true;
        core.collapseTimer = 0.8;
        if (!boss.inheritedCoreIds.includes(core.id)) {
          boss.inheritedCoreIds.push(core.id);
          boss.inheritedTimer = Math.min(boss.inheritedTimer, 1.6);
        }
        const pos = corePosition(core);
        burst(pos.x, pos.y, core.color, 46);
      }
      if (core.collapseTimer) {
        core.collapseTimer = Math.max(0, core.collapseTimer - 0.016);
      }
    });

    const defeatedCount = boss.cores.filter((core) => core.defeated).length;
    if (defeatedCount !== boss.defeatedCount) {
      boss.defeatedCount = defeatedCount;
      const aliveCores = boss.cores.filter((core) => core.hp > 0);
      boss.phaseName = defeatedCount === 0 ? (boss.direct ? "裸考高压" : "三核展开") : defeatedCount === 1 ? "压力上升" : "末核狂暴";
      if (aliveCores.length === 1 && !aliveCores[0].enraged) {
        aliveCores[0].enraged = true;
        aliveCores[0].finalForm = aliveCores[0].id;
        aliveCores[0].fireTimer = Math.min(aliveCores[0].fireTimer, 0.2);
        boss.comboTimer = Math.min(boss.comboTimer, 2.4);
        if (boss.ultimate) {
          boss.ultimate.timer = Math.min(boss.ultimate.timer, 4.2);
        }
      }
    }
  }

  function bossPhaseMultiplier() {
    const boss = game.boss;
    if (!boss) return 1;
    if (boss.defeatedCount >= 2) return 0.78;
    if (boss.defeatedCount === 1) return 0.92;
    return 1;
  }

  function bossCoreInterval(core) {
    const interval = (core.baseFireEvery || core.fireEvery) * bossPhaseMultiplier() * (core.enraged ? 0.95 : 1);
    return Math.max(core.enraged ? 0.74 : 0.52, interval);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  }

  function fireBossCore(core) {
    if (!isBossCoreFront(core)) return;
    const pos = corePosition(core);
    if (core.enraged && game.boss?.cores.filter((item) => item.hp > 0).length === 1) {
      fireLastCorePattern(pos, core);
      return;
    }
    if (core.attack === "laser") {
      fireDescartesLaser(pos, core);
      return;
    }
    if (core.attack === "matrix") {
      fireGaussMatrix(pos, core);
      return;
    }
    fireCauchyCurve(pos, core);
  }

  function fireLastCorePattern(pos, core) {
    if (core.id === "cauchy") {
      fireCauchyCurve(pos, core);
      const baseAngle = Math.atan2(game.player.y - pos.y, game.player.x - pos.x);
      for (let i = 0; i < 9; i += 1) {
        spawnEnemyShot(pos.x, pos.y, baseAngle + (Math.PI * 2 * i) / 9, 122, 11, core.color, {
          pattern: "spiral",
          curveAmp: 84,
          curveFreq: 5.4,
          curvePhase: i * 0.66,
          side: i % 2 ? 1 : -1,
          r: 5,
          life: 4.2,
        });
      }
      return;
    }

    if (core.id === "descartes") {
      fireDescartesLaser(pos, core);
      const snapX = clamp(game.player.x, arena.left + 84, arena.right - 84);
      const snapY = clamp(game.player.y, arena.top + 58, arena.bottom - 44);
      [-52, 52].forEach((offset) => {
        spawnEnemyLaser({
          orientation: "vertical",
          x: clamp(snapX + offset, arena.left + 54, arena.right - 54),
          warningTime: 0.58,
          activeTime: 0.28,
          width: 14,
          damage: 15,
          color: core.color,
          sourceX: pos.x,
          sourceY: pos.y,
        });
        spawnEnemyLaser({
          orientation: "horizontal",
          y: clamp(snapY + offset * 0.58, arena.top + 44, arena.bottom - 38),
          warningTime: 0.58,
          activeTime: 0.28,
          width: 14,
          damage: 15,
          color: core.color,
          sourceX: pos.x,
          sourceY: pos.y,
        });
      });
      return;
    }

    fireGaussMatrix(pos, core);
    const angle = Math.atan2(game.player.y - pos.y, game.player.x - pos.x);
    const sideX = -Math.sin(angle);
    const sideY = Math.cos(angle);
    for (let row = 0; row < 2; row += 1) {
      for (let col = -2; col <= 2; col += 1) {
        spawnEnemyShot(pos.x - Math.cos(angle) * row * 34 + sideX * col * 28, pos.y - Math.sin(angle) * row * 34 + sideY * col * 28, angle, 140 + row * 18, 12, core.color, {
          pattern: "matrix",
          shape: "square",
          r: 8,
          life: 4.4,
        });
      }
    }
  }

  function fireBossCombo(aliveCores) {
    const boss = game.boss;
    if (!boss) return;
    boss.comboCount += 1;
    const type = boss.comboType || bossComboType(aliveCores);
    boss.comboType = type;

    if (type === "trinity") {
      fireTrinityCombo(aliveCores);
    } else if (type === "curve_laser") {
      fireCurveLaserCombo(aliveCores);
    } else if (type === "grid_lock") {
      fireGridLockCombo(aliveCores);
    } else if (type === "matrix_spiral") {
      fireMatrixSpiralCombo(aliveCores);
    } else {
      aliveCores.forEach((core) => fireBossCore(core));
    }

    aliveCores.forEach((core) => {
      core.fireTimer = bossCoreInterval(core) * 1.05;
    });
  }

  function fireTrinityCombo(aliveCores) {
    const boss = game.boss;
    aliveCores.forEach((core) => fireBossCore(core));
    const centerAngle = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
    for (let i = 0; i < 12; i += 1) {
      const angle = centerAngle + (Math.PI * 2 * i) / 12;
      spawnEnemyShot(boss.x, boss.y, angle, 172, 11, colors.paper, {
        pattern: i % 2 ? "straight" : "spiral",
        curveAmp: 42,
        curveFreq: 4.1,
        curvePhase: i,
        side: i % 2 ? 1 : -1,
        r: 5,
        life: 3.6,
      });
    }
  }

  function fireCurveLaserCombo(aliveCores) {
    const cauchy = aliveCores.find((core) => core.id === "cauchy");
    const descartes = aliveCores.find((core) => core.id === "descartes");
    if (cauchy) fireCauchyCurve(corePosition(cauchy), cauchy);
    const source = descartes ? corePosition(descartes) : { x: game.boss.x, y: game.boss.y };
    const snapX = clamp(game.player.x, arena.left + 84, arena.right - 84);
    [-42, 42].forEach((offset) => {
      spawnEnemyLaser({
        orientation: "vertical",
        x: clamp(snapX + offset, arena.left + 60, arena.right - 60),
        warningTime: 0.66,
        activeTime: 0.34,
        width: 17,
        damage: 16,
        color: descartes?.color || colors.cyan,
        sourceX: source.x,
        sourceY: source.y,
      });
    });
  }

  function fireGridLockCombo(aliveCores) {
    const descartes = aliveCores.find((core) => core.id === "descartes");
    const gauss = aliveCores.find((core) => core.id === "gauss");
    if (gauss) fireGaussMatrix(corePosition(gauss), gauss);
    const source = descartes ? corePosition(descartes) : { x: game.boss.x, y: game.boss.y };
    const snapX = clamp(game.player.x, arena.left + 88, arena.right - 88);
    const snapY = clamp(game.player.y, arena.top + 60, arena.bottom - 48);
    [-64, 64].forEach((offset) => {
      spawnEnemyLaser({
        orientation: "vertical",
        x: clamp(snapX + offset, arena.left + 56, arena.right - 56),
        warningTime: 0.7,
        activeTime: 0.3,
        width: 15,
        damage: 15,
        color: descartes?.color || colors.cyan,
        sourceX: source.x,
        sourceY: source.y,
      });
      spawnEnemyLaser({
        orientation: "horizontal",
        y: clamp(snapY + offset * 0.66, arena.top + 46, arena.bottom - 42),
        warningTime: 0.7,
        activeTime: 0.3,
        width: 15,
        damage: 15,
        color: descartes?.color || colors.cyan,
        sourceX: source.x,
        sourceY: source.y,
      });
    });
  }

  function fireMatrixSpiralCombo(aliveCores) {
    const gauss = aliveCores.find((core) => core.id === "gauss");
    const cauchy = aliveCores.find((core) => core.id === "cauchy");
    if (gauss) fireGaussMatrix(corePosition(gauss), gauss);
    const color = cauchy?.color || colors.chalk;
    const baseAngle = Math.atan2(game.player.y - game.boss.y, game.player.x - game.boss.x);
    for (let i = 0; i < 10; i += 1) {
      spawnEnemyShot(game.boss.x, game.boss.y, baseAngle + (Math.PI * 2 * i) / 10, 136, 10, color, {
        pattern: "spiral",
        curveAmp: 64,
        curveFreq: 4.8,
        curvePhase: i * 0.7,
        side: i % 2 ? 1 : -1,
        r: 5,
        life: 3.8,
      });
    }
  }

  function fireCauchyCurve(pos, core) {
    const targetAngle = Math.atan2(game.player.y - pos.y, game.player.x - pos.x);
    for (let i = -2; i <= 2; i += 1) {
      spawnEnemyShot(pos.x, pos.y, targetAngle + i * 0.18, 150, 10, core.color, {
        pattern: "curve",
        curveAmp: 95 + Math.abs(i) * 16,
        curveFreq: 5.2 + Math.abs(i) * 0.45,
        curvePhase: i * 0.9,
        side: i % 2 === 0 ? 1 : -1,
        r: 5,
        label: i === 0 ? "∫" : "",
      });
    }
    for (let i = 0; i < 6; i += 1) {
      spawnEnemyShot(pos.x, pos.y, (Math.PI * 2 * i) / 6 + game.boss.angle * 0.35, 105, 8, core.color, {
        pattern: "spiral",
        curveAmp: 58,
        curveFreq: 4.4,
        curvePhase: i,
        side: 1,
        r: 4,
      });
    }
  }

  function fireDescartesLaser(pos, core) {
    const snapX = clamp(game.player.x, arena.left + 76, arena.right - 76);
    const snapY = clamp(game.player.y, arena.top + 50, arena.bottom - 38);
    spawnEnemyLaser({
      orientation: "vertical",
      x: snapX,
      y: 0,
      warningTime: 0.62,
      activeTime: 0.38,
      width: 22,
      damage: 18,
      color: core.color,
      sourceX: pos.x,
      sourceY: pos.y,
    });
    spawnEnemyLaser({
      orientation: "horizontal",
      x: 0,
      y: snapY,
      warningTime: 0.62,
      activeTime: 0.38,
      width: 22,
      damage: 18,
      color: core.color,
      sourceX: pos.x,
      sourceY: pos.y,
    });
  }

  function fireGaussMatrix(pos, core) {
    const targetAngle = Math.atan2(game.player.y - pos.y, game.player.x - pos.x);
    const forwardX = Math.cos(targetAngle);
    const forwardY = Math.sin(targetAngle);
    const sideX = -forwardY;
    const sideY = forwardX;
    const spacing = 24;
    for (let row = 0; row < 3; row += 1) {
      for (let col = -1; col <= 1; col += 1) {
        const startX = pos.x - forwardX * row * spacing + sideX * col * spacing;
        const startY = pos.y - forwardY * row * spacing + sideY * col * spacing;
        spawnEnemyShot(startX, startY, targetAngle, 128 + row * 18, 12, core.color, {
          pattern: "matrix",
          shape: "square",
          r: 8,
          pulse: 0.16 * (row + col + 2),
        });
      }
    }
  }

  function updateProjectiles(dt) {
    const updateShot = (shot) => {
      shot.age = (shot.age || 0) + dt;
      shot.prevX = shot.x;
      shot.prevY = shot.y;
      let curveOffset = 0;
      if (shot.pattern === "curve" || shot.pattern === "spiral") {
        curveOffset = Math.sin(shot.age * (shot.curveFreq || 4) + (shot.curvePhase || 0)) * (shot.curveAmp || 0);
      }
      const curveDelta = curveOffset - (shot.curveOffset || 0);
      shot.curveOffset = curveOffset;
      shot.x += shot.vx * dt + (shot.sideX || 0) * curveDelta;
      shot.y += shot.vy * dt + (shot.sideY || 0) * curveDelta;
      shot.life -= dt;
    };

    game.playerShots.forEach(updateShot);
    game.playerShots.forEach((shot) => {
      if (shot.splitAfter && !shot.splitDone && shot.age >= shot.splitAfter) {
        splitPlayerShot(shot);
        shot.splitDone = true;
        shot.life = Math.min(shot.life, 0.04);
      }
    });
    game.enemyShots.forEach(updateShot);
    game.playerShots.forEach(blockShotWithObstacles);
    game.enemyShots.forEach(blockShotWithObstacles);

    game.playerShots = game.playerShots.filter((shot) => shot.life > 0 && inBounds(shot.x, shot.y, 40));
    game.enemyShots = game.enemyShots.filter((shot) => shot.life > 0 && inBounds(shot.x, shot.y, 60));
  }

  function splitPlayerShot(shot) {
    const baseAngle = shot.angle ?? Math.atan2(shot.vy, shot.vx);
    const speed = shot.splitSpeed || Math.hypot(shot.vx, shot.vy) || 360;
    const damage = shot.damage * (shot.splitDamage || 0.5);
    const spawn = (angle, options = {}) => {
      game.playerShots.push({
        x: shot.x,
        y: shot.y,
        r: Math.max(3, shot.r * 0.72),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage,
        kind: shot.kind,
        color: shot.color,
        angle,
        pierce: options.pierce || 1,
        shape: options.shape || "circle",
        hitIds: new Set(),
        life: 0.9,
      });
    };

    if (shot.splitPattern === "lu") {
      [baseAngle, baseAngle + Math.PI / 2, baseAngle - Math.PI / 2, baseAngle + Math.PI].forEach((angle, index) => {
        spawn(angle, { shape: index % 2 ? "square" : "circle" });
      });
      return;
    }

    const count = shot.splitCount || 4;
    const spread = shot.splitSpread || 0.8;
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
      spawn(baseAngle + offset);
    }
  }

  function updateLasers(dt) {
    game.enemyLasers.forEach((laser) => {
      laser.age += dt;
    });
    game.enemyLasers = game.enemyLasers.filter((laser) => laser.age < laser.warningTime + laser.activeTime);
  }

  function isLaserActive(laser) {
    return laser.age >= laser.warningTime;
  }

  function updateSlashes(dt) {
    game.slashes.forEach((slash) => {
      slash.life -= dt;
      game.enemyShots = game.enemyShots.filter((shot) => distance(slash, shot) > slash.r + shot.r);
    });
    game.slashes = game.slashes.filter((slash) => slash.life > 0);
  }

  function blockShotWithObstacles(shot) {
    if (shot.life <= 0) return;
    const obstacle = game.obstacles.find((item) => !item.broken && circleObstacleCollision(shot, item, shot.r || 4));
    if (!obstacle) return;
    shot.life = 0;
    burst(shot.x, shot.y, colors.muted, shot.shape === "beam" ? 7 : 4);
  }

  function resolvePlayerObstacles() {
    const player = game.player;
    if (!player || !game.obstacles.length) return;
    game.obstacles.forEach((obstacle) => {
      if (obstacle.broken) return;
      const hit = circleObstacleHit(player, obstacle, player.r);
      if (!hit) return;
      let dx = player.x - hit.nearestX;
      let dy = player.y - hit.nearestY;
      let len = Math.hypot(dx, dy);
      if (len < 0.001) {
        const center = obstacleCenter(obstacle);
        dx = player.x - center.x;
        dy = player.y - center.y;
        len = Math.hypot(dx, dy) || 1;
      }
      const push = hit.collisionRadius - len + 0.5;
      player.x = clamp(player.x + (dx / len) * push, arena.left + 4, arena.right - 4);
      player.y = clamp(player.y + (dy / len) * push, arena.top + 8, arena.bottom - 4);
    });
  }

  function updateParticles(dt) {
    game.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    game.particles = game.particles.filter((p) => p.life > 0);
  }

  function shotHitsCircle(shot, target) {
    if (shot.shape === "beam" && shot.beamLength) {
      const angle = shot.angle ?? Math.atan2(shot.vy, shot.vx);
      const back = shot.beamLength * 0.35;
      const ax = shot.x - Math.cos(angle) * back;
      const ay = shot.y - Math.sin(angle) * back;
      const bx = shot.x + Math.cos(angle) * shot.beamLength;
      const by = shot.y + Math.sin(angle) * shot.beamLength;
      return distancePointToSegment(target.x, target.y, ax, ay, bx, by) <= (target.r || 0) + (shot.r || 0);
    }
    return distance(shot, target) <= (shot.r || 0) + (target.r || 0);
  }

  function applyShotExplosion(shot, target, type, coreRef) {
    if (!shot.blastRadius || shot.exploded) return;
    shot.exploded = true;
    const radius = shot.blastRadius;
    const splashDamage = shot.damage * 0.45;
    burst(target.x, target.y, shot.color || colors.warning, 18);

    if (type === "enemy") {
      game.enemies.forEach((enemy) => {
        if (enemy.defeated || enemy === target || shot.hitIds.has(enemy.id)) return;
        if (distance(enemy, target) > radius + enemy.r) return;
        enemy.hp -= splashDamage;
        enemy.backHitFlash = Math.max(enemy.backHitFlash || 0, 0.14);
        shot.hitIds.add(enemy.id);
        burst(enemy.x, enemy.y, enemy.color || colors.warning, 8);
      });
      return;
    }

    if (type === "boss" && game.boss) {
      game.boss.cores.forEach((core) => {
        if (core === coreRef || core.hp <= 0 || shot.hitIds.has(core.id)) return;
        const pos = corePosition(core);
        if (distance(pos, target) > radius + 25) return;
        damageBossCore(core, scaledBossDamage(splashDamage, shot.kind, core));
        shot.hitIds.add(core.id);
        burst(pos.x, pos.y, core.color, 8);
      });
    }
  }

  function applyPlayerDamageToCircle(target, type, coreRef) {
    const targetId = coreRef?.id || target.id || type;
    game.playerShots.forEach((shot) => {
      if (shot.hit) return;
      if (shot.hitIds?.has(targetId)) return;
      if (shotHitsCircle(shot, target)) {
        if (!shot.hitIds) shot.hitIds = new Set();
        let damage = type === "boss" ? scaledBossDamage(shot.damage, shot.kind, coreRef) : shot.damage;
        let backHit = false;
        if (type === "enemy") {
          const hit = monsterHitDamage(shot.damage, target, { x: shot.prevX ?? shot.x, y: shot.prevY ?? shot.y });
          damage = hit.amount;
          backHit = hit.backHit;
        }
        if (coreRef) {
          damageBossCore(coreRef, damage);
          burst(target.x, target.y, coreRef.shield > 0 ? colors.paper : coreRef.color, shot.blastRadius ? 16 : 4);
        } else {
          target.hp -= damage;
          target.backHitFlash = backHit ? 0.28 : target.backHitFlash || 0;
          burst(target.x, target.y, backHit ? colors.paper : target.color || colors.chalk, backHit ? 14 : shot.blastRadius ? 16 : 4);
        }
        applyShotExplosion(shot, target, type, coreRef);
        shot.hitIds.add(targetId);
        shot.pierce = (shot.pierce || 1) - 1;
        if (shot.pierce <= 0) shot.hit = true;
      }
    });
    game.playerShots = game.playerShots.filter((shot) => !shot.hit);

    game.slashes.forEach((slash) => {
      if (slash.hitIds.has(targetId)) return;
      if (distance(slash, target) <= slash.r + target.r) {
        let damage = type === "boss" ? scaledBossDamage(slash.damage, slash.kind || "calculus", coreRef) : slash.damage;
        let backHit = false;
        if (type === "enemy") {
          const hit = monsterHitDamage(slash.damage, target, { x: slash.originX ?? slash.x, y: slash.originY ?? slash.y });
          damage = hit.amount;
          backHit = hit.backHit;
        }
        if (coreRef) {
          damageBossCore(coreRef, damage);
          burst(target.x, target.y, coreRef.shield > 0 ? colors.paper : coreRef.color, 5);
        } else {
          target.hp -= damage;
          target.backHitFlash = backHit ? 0.28 : target.backHitFlash || 0;
          burst(target.x, target.y, backHit ? colors.paper : target.color || colors.chalk, backHit ? 14 : 5);
        }
        slash.hitIds.add(targetId);
      }
    });
  }

  function damageBossCore(core, amount) {
    const boss = game.boss;
    if (!isBossCoreFront(core, boss)) {
      core.guardFlash = 0.28;
      return;
    }
    let remaining = amount;
    let absorbed = 0;
    if ((core.shield || 0) > 0) {
      absorbed = Math.min(core.shield, remaining);
      core.shield = Math.max(0, core.shield - absorbed);
      remaining -= absorbed;
    }
    if (remaining > 0) {
      core.hp -= remaining;
    }
    core.hitFlash = 0.18;
    if (boss?.ultimate?.state === "charging") {
      boss.ultimate.damageTaken += remaining + absorbed * 0.55;
    }
  }

  function scaledBossDamage(baseDamage, weaponKind, coreRef) {
    if (!coreRef) return baseDamage;
    if (!isBossCoreFront(coreRef)) return 0;
    let damage = baseDamage * bossKindMultiplier(weaponKind, coreRef);
    const boss = game.boss;
    if (boss?.weakTimer > 0 && boss.weakCoreId) {
      damage *= boss.weakCoreId === coreRef.id ? 1.4 : 0.88;
    }
    if (coreRef.prepared) {
      damage *= 1.08;
    }
    return damage;
  }

  function bossKindMultiplier(weaponKind, coreRef) {
    if (!coreRef) return 1;
    return weaponKind === "sword" || weaponKind === coreRef.kind ? 1.25 : 0.8;
  }

  function applyPlayerDamage(amount, color) {
    const player = game.player;
    if (!player || amount <= 0) return 0;

    if ((player.blockCharges || 0) > 0) {
      player.blockCharges -= 1;
      player.invuln = Math.max(player.invuln, 0.55);
      burst(player.x, player.y, colors.paper, 18);
      return 0;
    }

    let remaining = amount;
    if ((player.shield || 0) > 0) {
      const absorbed = Math.min(player.shield, remaining);
      player.shield -= absorbed;
      remaining -= absorbed;
      burst(player.x, player.y, colors.cyan, 10);
    }

    if (remaining > 0) {
      player.hp -= remaining;
      if (hasBuff(player, "错题本")) {
        player.mistakeBoostTimer = 4;
      }
      burst(player.x, player.y, color || colors.danger, 16);
    }

    if (player.hp <= 0 && hasBuff(player, "绩点守护") && !player.gpaGuardUsed) {
      player.gpaGuardUsed = true;
      player.hp = Math.ceil(player.maxHp * 0.45);
      player.invuln = Math.max(player.invuln, 1.4);
      burst(player.x, player.y, colors.warning, 32);
    }

    return remaining;
  }

  function scaledIncomingDamage(amount) {
    const value = Number(amount) || 0;
    return game.activeRoom === "boss" ? value * bossDamageScale : value;
  }

  function checkPlayerHits() {
    const player = game.player;
    if (player.invuln > 0) return;

    for (const shot of game.enemyShots) {
      if (distance(player, shot) <= player.r + shot.r) {
        shot.life = 0;
        applyPlayerDamage(scaledIncomingDamage(shot.damage || baseStats.enemyBulletDamage || 10), shot.color || colors.danger);
        player.invuln = 0.65;
        break;
      }
    }

    if (player.invuln > 0) return;
    for (const laser of game.enemyLasers) {
      if (!isLaserActive(laser) || laser.hit) continue;
      const halfWidth = laser.width / 2;
      const hit =
        laser.orientation === "vertical"
          ? Math.abs(player.x - laser.x) <= player.r + halfWidth
          : Math.abs(player.y - laser.y) <= player.r + halfWidth;
      if (hit) {
        laser.hit = true;
        applyPlayerDamage(scaledIncomingDamage(laser.damage || 18), laser.color || colors.cyan);
        player.invuln = 0.78;
        break;
      }
    }
  }

  function spawnEnemyShot(x, y, angle, speed, damage, color, options = {}) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const side = options.side ?? 1;
    if (game.activeRoom === "boss" && game.boss) {
      const patternKey = options.pattern || "straight";
      game.boss.shotPatternCounts[patternKey] = (game.boss.shotPatternCounts[patternKey] || 0) + 1;
    }
    game.enemyShots.push({
      x,
      y,
      r: options.r ?? 6,
      vx: dirX * speed,
      vy: dirY * speed,
      sideX: -dirY * side,
      sideY: dirX * side,
      angle,
      damage,
      color,
      life: options.life ?? 5,
      age: 0,
      pattern: options.pattern || "straight",
      curveAmp: options.curveAmp || 0,
      curveFreq: options.curveFreq || 0,
      curvePhase: options.curvePhase || 0,
      curveOffset: 0,
      shape: options.shape || "circle",
      pulse: options.pulse || 0,
      label: options.label || "",
    });
  }

  function spawnEnemyLaser(options) {
    if (game.activeRoom === "boss" && game.boss) {
      game.boss.laserCount = (game.boss.laserCount || 0) + 1;
    }
    game.enemyLasers.push({
      orientation: options.orientation,
      x: options.x || 0,
      y: options.y || 0,
      warningTime: options.warningTime ?? 0.6,
      activeTime: options.activeTime ?? 0.35,
      width: options.width ?? 20,
      damage: options.damage ?? 18,
      color: options.color || colors.cyan,
      sourceX: options.sourceX ?? options.x ?? 0,
      sourceY: options.sourceY ?? options.y ?? 0,
      age: 0,
      hit: false,
    });
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.35 + Math.random() * 0.25,
      });
    }
  }

  function draw() {
    drawBackground();
    if (mode === "combat") {
      drawCombat();
    } else {
      drawAmbientMath();
    }
    if (isBossIntroActive()) {
      drawBossIntroOverlay();
    }
    requestAnimationFrame(loop);
  }

  function drawBossIntroOverlay() {
    const intro = game.boss?.intro;
    if (!intro) return;
    const t = intro.elapsed;
    const sceneProgress = clamp((t - intro.sceneFadeStart) / intro.sceneFadeDuration, 0, 1);
    const sceneAlpha = easeInOut(sceneProgress);
    ctx.save();
    ctx.globalAlpha = 1 - sceneAlpha;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (t < intro.blackTime) return;

    const titleFadeProgress = clamp((t - intro.titleFadeStart) / intro.titleFadeDuration, 0, 1);
    const titleAlpha = 1 - easeInOut(titleFadeProgress);
    const uiAlpha = Math.max(0, titleAlpha * 0.88);
    drawIntroScanlines(t, uiAlpha);
    drawIntroLockOn(t, uiAlpha);
    drawIntroDataBars(t, uiAlpha);
    if (titleAlpha <= 0) return;
    drawIntroTitle(t, titleAlpha);
  }

  function drawIntroTitle(t, alpha) {
    const glitch = Math.sin(t * 41) > 0.82 ? Math.sin(t * 131) * 6 : 0;
    const sliceOffset = Math.sin(t * 23) > 0.72 ? Math.cos(t * 89) * 12 : 0;
    const chars = ["\u4e09", "\u4f4d", "\u4e00", "\u4f53"];
    const spacing = 90;
    const startX = W / 2 - spacing * 1.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(255,255,255,0.72)";
    ctx.shadowBlur = 22;
    ctx.font = "bold 78px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    chars.forEach((char, index) => {
      const x = startX + index * spacing + (index % 2 === 0 ? glitch : -glitch);
      ctx.fillText(char, x, H * 0.43);
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.52;
    ctx.fillStyle = "rgba(130,200,216,0.82)";
    ctx.font = "bold 18px Consolas, Microsoft YaHei, sans-serif";
    ctx.fillText("TRI-CORE ENTITY / LOCKED", W / 2 + sliceOffset, H * 0.43 + 72);
    ctx.globalAlpha = alpha * 0.62;
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(W / 2 - 230 + sliceOffset, H * 0.43 - 4, 460, 12);
    ctx.fillStyle = "#fff";
    ctx.fillRect(W / 2 - 230 - sliceOffset * 0.45, H * 0.43 - 8, 460, 2);
    ctx.restore();
  }

  function drawIntroScanlines(t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    const offset = (t * 140) % 18;
    for (let y = -18 + offset; y < H; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = "rgba(130,200,216,0.5)";
    for (let i = 0; i < 7; i += 1) {
      const y = 82 + ((t * 90 + i * 71) % 370);
      const width = 90 + ((i * 53) % 170);
      ctx.fillRect((i * 137 + t * 42) % W, y, width, 2);
    }
    ctx.restore();
  }

  function drawIntroLockOn(t, alpha) {
    const cx = W / 2;
    const cy = H * 0.43;
    const radius = 160 + Math.sin(t * 3.4) * 5;
    ctx.save();
    ctx.globalAlpha = alpha * 0.52;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.setLineDash([22, 14]);
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / 3) + t * 0.08;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - 270, cy);
    ctx.lineTo(cx - 110, cy);
    ctx.moveTo(cx + 110, cy);
    ctx.lineTo(cx + 270, cy);
    ctx.moveTo(cx, cy - 130);
    ctx.lineTo(cx, cy - 72);
    ctx.moveTo(cx, cy + 92);
    ctx.lineTo(cx, cy + 138);
    ctx.stroke();
    ctx.restore();
  }

  function drawIntroDataBars(t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.74;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 1;
    const blocks = [
      { x: 82, y: 94, w: 210, label: "CORE A / INTEGRAL" },
      { x: W - 292, y: 94, w: 210, label: "CORE B / AXIS" },
      { x: 82, y: H - 106, w: 240, label: "CORE C / MATRIX" },
      { x: W - 322, y: H - 106, w: 240, label: "ENTITY: TRIUNITY" },
    ];
    blocks.forEach((block, index) => {
      const fill = clamp((t - 1.05 - index * 0.14) / 0.8, 0, 1);
      ctx.strokeRect(block.x, block.y, block.w, 24);
      ctx.fillRect(block.x, block.y, block.w * fill, 3);
      ctx.font = "11px Consolas, Microsoft YaHei, sans-serif";
      ctx.fillText(block.label, block.x + 8, block.y + 17);
    });
    ctx.restore();
  }

  function drawBackground() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#151718";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(244,240,230,0.035)";
    ctx.fillRect(arena.left, arena.top, arena.width, arena.height);
    ctx.strokeStyle = "rgba(244,240,230,0.08)";
    ctx.strokeRect(arena.left, arena.top, arena.width, arena.height);
  }

  function drawAmbientMath() {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = colors.paper;
    ctx.font = "34px Microsoft YaHei, sans-serif";
    ctx.fillText("∫", 140, 130);
    ctx.fillText("lim", 730, 130);
    ctx.fillText("A = LU", 142, 426);
    ctx.fillText("x² + y² = r²", 640, 426);
    ctx.restore();
  }

  function drawCombat() {
    if (game.activeRoom === "monster") {
      drawMonsterRoom();
    } else if (game.activeRoom === "boss") {
      drawBossRoom();
    }
    drawObstacles();
    drawLasers();
    drawShots();
    drawSlashes();
    drawParticles();
    drawPlayer();
    drawAimLine();
  }

  function drawMonsterRoom() {
    if (game.enemies.length > 1) {
      game.enemies.forEach((enemy) => {
        drawHealthBar(enemy.x - 38, enemy.y - 44, 76, 7, enemy.hp / enemy.maxHp, enemy.color);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        circle(enemy.x, enemy.y, enemy.r + 10);
        ctx.fillStyle = enemy.color;
        circle(enemy.x, enemy.y, enemy.r);
        drawEnemyFacing(enemy);
        ctx.fillStyle = "#101514";
        ctx.font = "bold 18px Microsoft YaHei, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(enemy.shortName || "?", enemy.x, enemy.y + 6);
      });
      ctx.textAlign = "start";
      return;
    }

    const enemy = game.enemies[0];
    if (!enemy) return;

    drawHealthBar(enemy.x - 38, enemy.y - 44, 76, 7, enemy.hp / enemy.maxHp, enemy.color);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    circle(enemy.x, enemy.y, enemy.r + 10);
    ctx.fillStyle = enemy.color;
    circle(enemy.x, enemy.y, enemy.r);
    drawEnemyFacing(enemy);
    ctx.fillStyle = "#101514";
    ctx.font = "bold 18px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(enemy.shortName || "?", enemy.x, enemy.y + 6);
    ctx.textAlign = "start";
  }

  function drawObstacles() {
    game.obstacles.forEach((obstacle) => {
      ctx.save();
      if (obstacle.broken) {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "rgba(17, 19, 20, 0.38)";
        ctx.strokeStyle = "rgba(244, 240, 230, 0.12)";
        ctx.setLineDash([7, 7]);
        ctx.lineWidth = 1.5;
        drawObstacleShape(obstacle, false, 0);
        ctx.restore();
        return;
      }

      const marked = Boolean(obstacle.marked);
      const markProgress = marked ? 1 - clamp((obstacle.markTimer || 0) / (obstacle.maxMarkTimer || 1), 0, 1) : 0;
      ctx.fillStyle = marked ? "rgba(50, 38, 24, 0.98)" : "rgba(36, 40, 40, 0.96)";
      ctx.strokeStyle = marked ? `rgba(240, 195, 93, ${0.48 + markProgress * 0.42})` : "rgba(244, 240, 230, 0.24)";
      ctx.lineWidth = 2;
      ctx.shadowColor = marked ? colors.warning : "transparent";
      ctx.shadowBlur = marked ? 12 + markProgress * 12 : 0;
      drawObstacleShape(obstacle, true, markProgress);
      ctx.shadowBlur = 0;
      if (obstacle.shape === "rect") {
        ctx.fillStyle = "rgba(244, 240, 230, 0.08)";
        ctx.fillRect(obstacle.x + 6, obstacle.y + 5, Math.max(0, obstacle.w - 12), 3);
      }
      if (marked && obstacle.shape === "rect") {
        ctx.fillStyle = `rgba(240, 195, 93, ${0.14 + markProgress * 0.16})`;
        ctx.fillRect(obstacle.x + 4, obstacle.y + obstacle.h - 7, Math.max(0, (obstacle.w - 8) * markProgress), 3);
      }
      if (obstacle.shape === "rect") {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 8, obstacle.y + obstacle.h - 5);
        ctx.lineTo(obstacle.x + obstacle.w - 8, obstacle.y + obstacle.h - 5);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawObstacleShape(obstacle, solid = true, markProgress = 0) {
    if (obstacle.shape === "line" || obstacle.shape === "curve") {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(5, obstacle.thickness || 9);
      ctx.beginPath();
      obstacle.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      if (solid) {
        ctx.strokeStyle = `rgba(244, 240, 230, ${0.07 + markProgress * 0.08})`;
        ctx.lineWidth = Math.max(2, (obstacle.thickness || 9) * 0.34);
        ctx.stroke();
      }
      return;
    }

    if (obstacle.shape === "blob") {
      ctx.beginPath();
      obstacle.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 5, true, true);
  }

  function drawEnemyFacing(enemy) {
    const angle = enemy.facingAngle ?? Math.PI / 2;
    const backAngle = angle + Math.PI;
    const weakX = enemy.x + Math.cos(backAngle) * (enemy.r + 3);
    const weakY = enemy.y + Math.sin(backAngle) * (enemy.r + 3);
    const flash = clamp((enemy.backHitFlash || 0) / 0.28, 0, 1);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(16,21,20,0.72)";
    ctx.beginPath();
    ctx.moveTo(enemy.r + 7, 0);
    ctx.lineTo(enemy.r - 4, -5);
    ctx.lineTo(enemy.r - 4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.62 + flash * 0.38;
    ctx.strokeStyle = flash > 0 ? colors.paper : "rgba(244,240,230,0.72)";
    ctx.fillStyle = flash > 0 ? "rgba(244,240,230,0.28)" : "rgba(21,23,24,0.38)";
    ctx.lineWidth = 2 + flash * 2;
    ctx.beginPath();
    ctx.arc(weakX, weakY, 7 + flash * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBossRoom() {
    const boss = game.boss;
    if (!boss) return;
    const ultimateCharging = isBossUltimateCharging(boss);

    if (ultimateCharging) {
      drawBossUltimateCharge(boss);
    }

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(boss.angle * 0.35);
    ctx.strokeStyle = ultimateCharging ? "rgba(244,240,230,0.62)" : boss.rotating ? "rgba(240,195,93,0.44)" : "rgba(255,255,255,0.14)";
    ctx.lineWidth = ultimateCharging || boss.rotating ? 3 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(244,240,230,0.06)";
    circle(0, 0, 30);
    ctx.fillStyle = colors.paper;
    ctx.font = "bold 13px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("期末", 0, 5);
    ctx.restore();

    ctx.beginPath();
    const positions = boss.cores.map(corePosition);
    ctx.strokeStyle = ultimateCharging ? "rgba(244,240,230,0.58)" : boss.comboWarning > 0 ? "rgba(231,111,97,0.55)" : "rgba(255,255,255,0.16)";
    ctx.lineWidth = ultimateCharging || boss.comboWarning > 0 ? 3 : 2;
    positions.forEach((pos, index) => {
      if (index === 0) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    });
    ctx.closePath();
    ctx.stroke();

    const frontIds = new Set(bossFrontCoreIds(boss));
    boss.cores.forEach((core, index) => {
      const pos = corePosition(core);
      const alive = core.hp > 0;
      const front = alive && frontIds.has(core.id);
      const invulnerable = alive && !front;
      const introAlpha = bossIntroCoreAlpha(index);
      const weak = front && boss.weakTimer > 0 && boss.weakCoreId === core.id;
      const flash = clamp((core.hitFlash || 0) / 0.18, 0, 1);
      const guardFlash = clamp((core.guardFlash || 0) / 0.28, 0, 1);
      const pulse = 1 + Math.sin(performance.now() / (weak ? 100 : 180) + core.offset) * (weak ? 0.09 : 0.05);
      ctx.save();
      ctx.globalAlpha = alive ? introAlpha * (invulnerable ? 0.52 : 1) : 0.24;
      ctx.shadowColor = invulnerable ? colors.paper : weak ? colors.paper : core.enraged ? colors.danger : core.color;
      ctx.shadowBlur = alive ? (invulnerable ? guardFlash * 18 : weak ? 30 : core.enraged ? 24 : 10) + flash * 16 : 0;
      ctx.fillStyle = invulnerable ? "rgba(244,240,230,0.045)" : weak ? "rgba(244,240,230,0.16)" : core.enraged ? "rgba(231,111,97,0.18)" : "rgba(255,255,255,0.08)";
      circle(pos.x, pos.y, (weak ? 43 : core.enraged ? 40 : 34) * pulse + flash * 3);
      ctx.shadowBlur = 0;
      drawCoreGlyph(core, pos);
      ctx.fillStyle = invulnerable ? "rgba(244,240,230,0.45)" : core.color;
      circle(pos.x, pos.y, (core.enraged ? 27 : 25) * pulse);
      ctx.fillStyle = "#111";
      ctx.font = "bold 16px Microsoft YaHei, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(core.symbol || core.name.slice(0, 2), pos.x, pos.y + 5);
      drawHealthBar(pos.x - 42, pos.y - 52, 84, 7, Math.max(0, core.hp / core.maxHp), core.color);
      if ((core.maxShield || 0) > 0) {
        drawHealthBar(pos.x - 42, pos.y - 42, 84, 4, Math.max(0, (core.shield || 0) / core.maxShield), colors.cyan);
      }
      if (invulnerable) {
        ctx.strokeStyle = `rgba(244,240,230,${0.42 + guardFlash * 0.32})`;
        ctx.lineWidth = 2 + guardFlash * 2;
        ctx.setLineDash([9, 7]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 37 + Math.sin(performance.now() / 120) * 2 + guardFlash * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (weak) {
        ctx.strokeStyle = colors.paper;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 39 + Math.sin(performance.now() / 70) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (core.enraged) {
        ctx.strokeStyle = colors.danger;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 33 + Math.sin(performance.now() / 90) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.textAlign = "start";
  }

  function drawBossUltimateCharge(boss) {
    const ultimate = boss.ultimate;
    const activeCores = bossActiveCores(boss);
    const progress = clamp((ultimate?.charge || 0) / (ultimate?.chargeTime || 1), 0, 1);
    const pressure = clamp((ultimate?.damageTaken || 0) / Math.max(1, (ultimate?.requiredPerCore || 1) * Math.max(1, activeCores.length)), 0, 1);
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.strokeStyle = "rgba(244,240,230,0.52)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 72 + Math.sin(performance.now() / 70) * 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.strokeStyle = "rgba(143,209,158,0.66)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pressure);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.46 + progress * 0.28;
    ctx.strokeStyle = "rgba(244,240,230,0.48)";
    ctx.lineWidth = 1.5;
    activeCores.forEach((core) => {
      const pos = corePosition(core);
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function bossIntroCoreAlpha(index) {
    const intro = game.boss?.intro;
    if (!isBossIntroActive() || !intro) return 1;
    const start = intro.coreLightTimes[index] ?? intro.sceneFadeStart;
    const progress = clamp((intro.elapsed - start) / 0.42, 0, 1);
    return 0.12 + easeInOut(progress) * 0.88;
  }

  function drawCoreGlyph(core, pos) {
    ctx.save();
    ctx.strokeStyle = core.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha *= 0.58;
    if (core.id === "descartes") {
      ctx.beginPath();
      ctx.moveTo(pos.x - 38, pos.y);
      ctx.lineTo(pos.x + 38, pos.y);
      ctx.moveTo(pos.x, pos.y - 38);
      ctx.lineTo(pos.x, pos.y + 38);
      ctx.stroke();
    } else if (core.id === "gauss") {
      for (let row = -1; row <= 1; row += 1) {
        for (let col = -1; col <= 1; col += 1) {
          ctx.strokeRect(pos.x + col * 17 - 5, pos.y + row * 17 - 5, 10, 10);
        }
      }
    } else {
      ctx.beginPath();
      for (let i = 0; i < 38; i += 1) {
        const t = i / 37;
        const x = pos.x - 38 + t * 76;
        const y = pos.y + Math.sin(t * Math.PI * 2) * 15;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShots() {
    game.playerShots.forEach((shot) => {
      ctx.save();
      ctx.fillStyle = shot.color || colors.mint;
      ctx.strokeStyle = shot.color || colors.mint;
      if (shot.shape === "beam") {
        const angle = shot.angle ?? Math.atan2(shot.vy, shot.vx);
        const len = shot.beamLength || 48;
        ctx.globalAlpha = 0.86;
        ctx.lineWidth = Math.max(3, shot.r * 2);
        ctx.beginPath();
        ctx.moveTo(shot.x - Math.cos(angle) * len * 0.35, shot.y - Math.sin(angle) * len * 0.35);
        ctx.lineTo(shot.x + Math.cos(angle) * len, shot.y + Math.sin(angle) * len);
        ctx.stroke();
      } else if (shot.shape === "square") {
        const size = shot.r * 2.15;
        ctx.translate(shot.x, shot.y);
        ctx.rotate((shot.angle || 0) + Math.PI / 4);
        ctx.fillRect(-size / 2, -size / 2, size, size);
      } else {
        circle(shot.x, shot.y, shot.r);
      }
      ctx.restore();
    });
    game.enemyShots.forEach((shot) => {
      const pulse = 1 + Math.sin(((shot.age || 0) + (shot.pulse || 0)) * 12) * 0.08;
      ctx.fillStyle = shot.color || colors.danger;
      if (shot.shape === "square") {
        const size = shot.r * 2.25 * pulse;
        ctx.save();
        ctx.translate(shot.x, shot.y);
        ctx.rotate((shot.angle || 0) + Math.PI / 4);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeStyle = "rgba(255,255,255,0.42)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        circle(shot.x, shot.y, shot.r * pulse);
      }
      if (shot.label) {
        ctx.save();
        ctx.fillStyle = colors.ink;
        ctx.font = "bold 12px Microsoft YaHei, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(shot.label, shot.x, shot.y + 0.5);
        ctx.restore();
      }
    });
  }

  function drawLasers() {
    game.enemyLasers.forEach((laser) => {
      const active = isLaserActive(laser);
      const pulse = 0.5 + Math.sin(laser.age * 26) * 0.5;
      ctx.save();
      if (active) {
        ctx.globalAlpha = 0.78;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = laser.color;
        ctx.lineWidth = laser.width;
        traceLaser(laser);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = "rgba(255,255,255,0.76)";
        ctx.lineWidth = Math.max(4, laser.width * 0.24);
        traceLaser(laser);
      } else {
        ctx.globalAlpha = 0.22 + pulse * 0.18;
        ctx.strokeStyle = laser.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        traceLaser(laser);
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(laser.sourceX, laser.sourceY);
        if (laser.orientation === "vertical") {
          ctx.lineTo(laser.x, laser.sourceY);
          ctx.lineTo(laser.x, arena.bottom);
        } else {
          ctx.lineTo(laser.sourceX, laser.y);
          ctx.lineTo(arena.right, laser.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function traceLaser(laser) {
    ctx.beginPath();
    if (laser.orientation === "vertical") {
      ctx.moveTo(laser.x, arena.top);
      ctx.lineTo(laser.x, arena.bottom);
    } else {
      ctx.moveTo(arena.left, laser.y);
      ctx.lineTo(arena.right, laser.y);
    }
    ctx.stroke();
  }

  function drawSlashes() {
    game.slashes.forEach((slash) => {
      const progress = slash.life / slash.maxLife;
      ctx.save();
      ctx.translate(slash.x, slash.y);
      ctx.rotate(slash.angle);
      ctx.globalAlpha = Math.max(0, progress);
      ctx.strokeStyle = slash.color || colors.mint;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, slash.r * 0.68, -0.8, 0.8);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawParticles() {
    game.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillStyle = p.color;
      circle(p.x, p.y, 3);
      ctx.globalAlpha = 1;
    });
  }

  function drawPlayer() {
    const player = game.player;
    if ((player.shield || 0) > 0 || (player.blockCharges || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = (player.shield || 0) > 0 ? 0.38 : 0.24;
      ctx.strokeStyle = (player.blockCharges || 0) > 0 ? colors.paper : colors.cyan;
      ctx.lineWidth = (player.blockCharges || 0) > 0 ? 4 : 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = player.invuln > 0 ? 0.62 : 1;
    ctx.fillStyle = "rgba(244,240,230,0.16)";
    circle(player.x, player.y, player.r + 9);
    ctx.fillStyle = colors.paper;
    circle(player.x, player.y, player.r);
    ctx.fillStyle = colors.ink;
    ctx.font = "bold 18px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("学", player.x, player.y + 6);
    ctx.textAlign = "start";
    ctx.globalAlpha = 1;
  }

  function drawAimLine() {
    const player = game.player;
    if (!player) return;
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    ctx.strokeStyle = "rgba(184,240,196,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40);
    ctx.stroke();
  }

  function drawHealthBar(x, y, w, h, ratio, color) {
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.strokeRect(x, y, w, h);
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function corePosition(core) {
    const boss = game.boss;
    const radius = 92;
    const angle = boss.angle + core.offset - Math.PI / 2;
    return {
      x: boss.x + Math.cos(angle) * radius,
      y: boss.y + Math.sin(angle) * radius,
    };
  }

  function updateHud() {
    const player = game.player;
    if (!player) return;
    hud.root?.classList.toggle("hud-intro-hidden", isBossIntroActive());
    if (hud.hp) {
      const shieldText = player.shield > 0 ? ` +${Math.ceil(player.shield)}盾` : "";
      const blockText = player.blockCharges > 0
        ? ` | 免伤x${player.blockCharges}`
        : hasBuff(player, "草稿纸护盾")
          ? ` | 免伤${Math.ceil(player.blockTimer || draftShieldInterval)}s`
          : "";
      hud.hp.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}${shieldText}${blockText}`;
    }
    const weaponNames = player.weapons
      .map((weapon, index) => `${index + 1}.${displayWeaponName(weapon)} ${ammoLabel(weapon)}`)
      .join(" / ");
    if (hud.weapon) {
      hud.weapon.textContent = `${player.weaponIndex + 1}. ${displayWeaponName(player.weapon)}`;
      hud.weapon.title = `${weaponNames}；按 1-9 或 Q 切换，按 R 换弹，按 B 打开背包`;
    }
    if (hud.ammo) {
      hud.ammo.textContent = ammoLabel(player.weapon);
      hud.ammo.title = player.weapon.infiniteAmmo ? "该武器没有弹药限制" : "按 R 手动换弹；打空后自动换弹";
    }
    if (hud.inventory) {
      hud.inventory.title = `按 B 打开背包；击败 ${game.kills}，拥有武器 ${game.weaponsFound}`;
    }
  }

  const buffDetails = {
    临时抱佛脚: {
      type: "补给增益",
      effect: "立即回复 30 点生命值。重复获得会再次触发回复。",
      source: "补给房随机获得。",
    },
    学霸笔记: {
      type: "战斗增益",
      effect: "造成伤害提高 10%。",
      source: "宝箱房获得远程武器时附带。",
    },
    公式大全: {
      type: "战斗增益",
      effect: "造成伤害提高 10%。可与学霸笔记同时生效。",
      source: "补给房随机获得。",
    },
    熬夜咖啡: {
      type: "战斗增益",
      effect: "移动速度提高 100%。",
      source: "补给房随机获得。",
    },
    草稿纸护盾: {
      type: "生存增益",
      effect: "最多同时存在 1 层免伤。获得时立刻补满，之后每 10 秒补充 1 层；受到伤害时优先消耗，完全抵消该次伤害。",
      source: "宝箱房或补给房随机获得。",
    },
    错题本: {
      type: "反击增益",
      effect: "被击中后 4 秒内造成伤害提高 25%。",
      source: "补给房随机获得。",
    },
    绩点守护: {
      type: "生存增益",
      effect: "濒死时自动触发一次，回复至 45% 最大生命值并获得短暂无敌。",
      source: "补给房随机获得。",
    },
    函数机枪: {
      type: "知识印记",
      effect: "表示已完成微积分教室并获得函数机枪；函数机枪对柯西核心有克制伤害。",
      source: "击败拉格朗日投影或宝箱获得。",
    },
    积分狙击枪: {
      type: "知识印记",
      effect: "表示已获得积分狙击枪；它发射高伤害穿透弹，适合点杀高血量目标。",
      source: "击败洛必达投影或宝箱获得。",
    },
    泰勒扩散炮: {
      type: "知识印记",
      effect: "表示已获得泰勒扩散炮；子弹飞行一段时间后分裂，适合清理弹幕空隙里的小怪。",
      source: "击败泰勒投影或宝箱获得。",
    },
    坐标系大宝剑: {
      type: "知识印记",
      effect: "表示已获得坐标系大宝剑；攻击会形成横纵坐标轴式十字斩击。",
      source: "击败阿基米德投影或宝箱获得。",
    },
    极坐标霰弹枪: {
      type: "知识印记",
      effect: "表示已完成欧氏几何教室并获得极坐标霰弹枪；它对笛卡尔核心有克制伤害。",
      source: "击败笛卡尔投影或宝箱获得。",
    },
    几何护盾: {
      type: "知识印记",
      effect: "表示已获得几何护盾；它会周期性生成护盾，主动攻击还能清除附近弹幕。",
      source: "击败欧几里得投影或宝箱获得。",
    },
    "矩阵 RPG": {
      type: "知识印记",
      effect: "表示已完成线性代数教室并获得矩阵 RPG；它对高斯核心有克制伤害。",
      source: "击败高斯投影或宝箱获得。",
    },
    "LU 分解法杖": {
      type: "知识印记",
      effect: "表示已获得 LU 分解法杖；子弹会分裂成 L/U 方向弹道。",
      source: "击败若尔当投影或宝箱获得。",
    },
    行列式激光: {
      type: "知识印记",
      effect: "表示已获得行列式激光；按住攻击可以形成稳定的直线激光弹道。",
      source: "击败高斯投影或宝箱获得。",
    },
    泰勒展开: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表泰勒扩散炮相关路线已出现。",
      source: "随机房击败泰勒投影。",
    },
    洛必达法则: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表积分狙击枪相关路线已出现。",
      source: "随机房击败洛必达投影。",
    },
    圆面积: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表坐标系大宝剑相关路线已出现。",
      source: "随机房击败阿基米德投影。",
    },
    几何直觉: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表几何护盾相关路线已出现。",
      source: "随机房击败欧几里得投影。",
    },
    雅可比矩阵: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表矩阵 RPG 相关路线已出现。",
      source: "随机房击败雅可比投影。",
    },
    约旦标准型: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表 LU 分解法杖相关路线已出现。",
      source: "随机房击败若尔当投影。",
    },
    高斯消元: {
      type: "知识印记",
      effect: "随机房通关记录；同时代表行列式激光相关路线已出现。",
      source: "随机房击败高斯投影。",
    },
  };

  function buffInfoMarkup() {
    const player = game.player;
    if (!player?.buffs?.length) {
      return `
        <p class="buff-empty">当前暂无增益。进入知识点房间、宝箱房或补给房后，这里会显示已获得增益的效果说明。</p>
      `;
    }

    const counts = player.buffs.reduce((map, buff) => {
      map.set(buff, (map.get(buff) || 0) + 1);
      return map;
    }, new Map());

    const cards = Array.from(counts.entries()).map(([name, count]) => {
      const detail = buffDetails[name] || {
        type: "增益",
        effect: "当前基础版暂未记录该增益的具体说明。",
        source: "房间奖励。",
      };
      const repeated = count > 1 ? `<span class="buff-count">x${count}</span>` : "";
      const repeatNote = count > 1 ? `<p class="buff-repeat">重复获得会记录次数；持续型战斗增益按有/无生效，即时型增益会在获得时立即触发。</p>` : "";
      return `
        <article class="buff-card">
          <header>
            <div>
              <strong>${name}</strong>
              <span>${detail.type}</span>
            </div>
            ${repeated}
          </header>
          <p>${detail.effect}</p>
          <small>来源：${detail.source}</small>
          ${repeatNote}
        </article>
      `;
    }).join("");

    return `
      <p>这里显示当前已获得的增益、知识印记和它们的实际作用。</p>
      <div class="buff-list">${cards}</div>
    `;
  }

  function weaponKindLabel(kind) {
    return {
      sword: "圣剑",
      calculus: "微积分",
      geometry: "欧氏几何",
      linear: "线性代数",
    }[kind] || kind || "-";
  }

  function weaponTargetLabel(kind) {
    return {
      sword: "全部 Boss 核心",
      calculus: "柯西核心",
      geometry: "笛卡尔核心",
      linear: "高斯核心",
    }[kind] || "-";
  }

  function weaponSourceLabel(id) {
    return {
      sword: "初始武器",
      functionGun: "微积分教室 / 随机宝箱 / 重复强化",
      integralSniper: "洛必达投影 / 随机宝箱 / 重复强化",
      taylorCannon: "泰勒投影 / 随机宝箱 / 重复强化",
      coordinateBlade: "阿基米德投影 / 随机宝箱 / 重复强化",
      polarShotgun: "欧氏几何教室 / 随机宝箱 / 重复强化",
      geometryShield: "欧几里得投影 / 随机宝箱 / 重复强化",
      matrixRpg: "线性代数教室 / 随机宝箱 / 重复强化",
      luStaff: "若尔当投影 / 随机宝箱 / 重复强化",
      determinantLaser: "高斯投影 / 随机宝箱 / 重复强化",
    }[id] || "-";
  }

  function fixedNumber(value, digits = 2) {
    if (!Number.isFinite(Number(value))) return "-";
    return Number(value).toFixed(digits).replace(/\.?0+$/, "");
  }

  function weaponDamageLabel(weapon) {
    const pellets = weapon.pellets || 1;
    const damage = weapon.damage * weaponDamageScale(weapon);
    if (pellets > 1) {
      return `${fixedNumber(damage, 1)} x ${pellets} = ${fixedNumber(damage * pellets, 1)}`;
    }
    return fixedNumber(damage, 1);
  }

  function weaponTheory(weapon) {
    const damage = weapon.damage * weaponDamageScale(weapon);
    let attackValue = damage * (weapon.pellets || 1);
    if (weapon.special === "crossSlash") attackValue = damage * 2.2;
    if (weapon.special === "shieldPulse") attackValue = damage * 1.35;
    if (weapon.splitPattern === "lu") {
      attackValue += damage * (weapon.splitDamage || 0.5) * 4;
    } else if (weapon.splitCount) {
      attackValue += damage * (weapon.splitDamage || 0.5) * weapon.splitCount;
    }
    if (weapon.blastRadius) attackValue += damage * 0.55;

    const burstDps = attackValue / Math.max(0.01, weapon.cooldown || 1);
    const cycleTime = weapon.infiniteAmmo
      ? Math.max(0.01, weapon.cooldown || 1)
      : Math.max(0.01, (weapon.cooldown || 1) * (weapon.magazine || 1) + (weapon.reloadTime || 0));
    const sustainDps = weapon.infiniteAmmo
      ? burstDps
      : (attackValue * (weapon.magazine || 1)) / cycleTime;
    const utility = 1
      + (weapon.pierce ? Math.min(0.28, (weapon.pierce - 1) * 0.09) : 0)
      + (weapon.shape === "beam" ? 0.12 : 0)
      + (weapon.blastRadius ? 0.18 : 0)
      + (weapon.special === "shieldPulse" ? 0.32 : 0);
    return {
      id: weapon.id,
      name: displayWeaponName(weapon),
      burstDps: Math.round(burstDps * 10) / 10,
      sustainDps: Math.round(sustainDps * 10) / 10,
      balanceScore: Math.round(sustainDps * utility * 10) / 10,
    };
  }

  function weaponAmmoLabel(weapon) {
    return weapon.infiniteAmmo ? "无限" : `${weapon.magazine} 发 / ${fixedNumber(weapon.reloadTime, 2)}s`;
  }

  function weaponProjectileLabel(weapon) {
    if (weapon.special === "crossSlash") return `十字范围斩击 / 半径 ${weapon.slashRadius || 52}`;
    if (weapon.special === "shieldPulse") return `护盾脉冲 / 半径 ${weapon.pulseRadius || 72} / 每 ${fixedNumber(weapon.shieldEvery, 1)}s 生成 ${weapon.shieldValue} 护盾`;
    if (!weapon.ranged && weapon.directBossAwakened) return `觉醒挥砍 / 半径 ${weapon.slashRadius || swordSlashRadius}`;
    if (!weapon.ranged) return "近战挥砍";
    const parts = [
      `${weapon.pellets || 1} 发`,
      `${weapon.speed || 540} 速度`,
      `${weapon.projectileRadius || 5} 半径`,
    ];
    if (weapon.spread) parts.push(`${fixedNumber(weapon.spread, 2)} 散布`);
    if (weapon.pierce) parts.push(`穿透 ${weapon.pierce}`);
    if (weapon.splitAfter) parts.push(`${fixedNumber(weapon.splitAfter, 2)}s 后分裂`);
    if (weapon.blastRadius) parts.push(`${weapon.blastRadius} 爆风`);
    if (weapon.shape === "beam") parts.push("持续激光");
    return parts.join(" / ");
  }

  function weaponStatsMarkup() {
    const ids = Object.keys(weapons);
    const rows = ids.map((id) => {
      const weapon = weapons[id];
      return `
        <tr>
          <th scope="row">${weapon.name}</th>
          <td>${weaponKindLabel(weapon.kind)}</td>
          <td>${weapon.ranged ? "远程" : "近战"}</td>
          <td>${weaponDamageLabel(weapon)}</td>
          <td>${fixedNumber(weapon.cooldown, 2)}s</td>
          <td>${weaponAmmoLabel(weapon)}</td>
          <td>${weaponProjectileLabel(weapon)}</td>
          <td>${weaponTargetLabel(weapon.kind)}</td>
          <td>${weaponSourceLabel(id)}</td>
        </tr>
      `;
    }).join("");

    return `
      <p>以下为 1 级基础数据。重复获得同类武器后，现有武器会升级，伤害、弹匣和换弹效率会同步提升。</p>
      <div class="weapon-table-wrap">
        <table class="weapon-table">
          <thead>
            <tr>
              <th scope="col">武器</th>
              <th scope="col">学科</th>
              <th scope="col">类型</th>
              <th scope="col">每次攻击伤害</th>
              <th scope="col">冷却</th>
              <th scope="col">弹匣 / 换弹</th>
              <th scope="col">弹道参数</th>
              <th scope="col">克制目标</th>
              <th scope="col">获得方式</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="weapon-note">Boss 战中，对应学科武器命中对应核心造成 1.25 倍伤害，非对应学科武器造成 0.8 倍伤害。</p>
      ${ownedWeaponStatsMarkup()}
    `;
  }

  function ownedWeaponStatsMarkup({ heading = true } = {}) {
    const player = game.player;
    if (!player?.weapons?.length) return "";
    const rows = player.weapons.map((weapon, index) => `
      <tr>
        <th scope="row">${index + 1}. ${displayWeaponName(weapon)}</th>
        <td>${weapon.level || 1}</td>
        <td>${weaponDamageLabel(weapon)}</td>
        <td>${fixedNumber(weapon.cooldown, 2)}s</td>
        <td>${ammoLabel(weapon)}</td>
      </tr>
    `).join("");
    return `
      ${heading ? "<h3>当前背包数据</h3>" : ""}
      <div class="weapon-table-wrap compact">
        <table class="weapon-table">
          <thead>
            <tr>
              <th scope="col">背包武器</th>
              <th scope="col">等级</th>
              <th scope="col">当前伤害</th>
              <th scope="col">当前冷却</th>
              <th scope="col">当前弹药</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function inventoryMarkup() {
    const weaponsBlock = ownedWeaponStatsMarkup({ heading: false }) || `<p class="buff-empty">当前还没有可查看的武器。</p>`;
    return `
      <div class="inventory-grid">
        <section class="inventory-section">
          <h3>拥有武器</h3>
          ${weaponsBlock}
        </section>
        <section class="inventory-section">
          <h3>当前增益</h3>
          ${buffInfoMarkup()}
        </section>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatLeaderboardTime(seconds) {
    const safeSeconds = Math.max(1, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return minutes ? `${minutes}分${String(rest).padStart(2, "0")}秒` : `${rest}秒`;
  }

  function formatLeaderboardDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "未知时间";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function leaderboardTableMarkup(title, kind, rows, emptyText) {
    return `
      <section class="leaderboard-board" data-board="${kind}">
        <h3>${title}</h3>
        ${rows.length ? `
          <div class="leaderboard-table-wrap">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>名次</th>
                  <th>姓名</th>
                  <th>积分</th>
                  <th>用时</th>
                  <th>房间</th>
                  <th>击败</th>
                  <th>路线</th>
                  <th>日期</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((entry, index) => {
                  const route = entry.completedRooms.length ? entry.completedRooms.join("、") : "直通 Boss";
                  return `
                    <tr>
                      <th>${index + 1}</th>
                      <td data-column="name">${escapeHtml(entry.name)}</td>
                      <td data-column="score">${entry.score}</td>
                      <td data-column="time">${formatLeaderboardTime(entry.seconds)}</td>
                      <td>${entry.completedRooms.length}/6</td>
                      <td>${entry.kills}</td>
                      <td>${escapeHtml(route)}</td>
                      <td>${formatLeaderboardDate(entry.playedAt)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        ` : `<p class="buff-empty">${emptyText}</p>`}
      </section>
    `;
  }

  function leaderboardMarkup(entries = readLeaderboard()) {
    const boards = leaderboardRankings(entries);
    if (!boards.score.length && !boards.time.length && !boards.sword.length) {
      return `<p class="buff-empty">暂无通关记录。击败 Boss 后，进入任意榜单前十的成绩可以在结算页留名。</p>`;
    }

    return `
      <div class="leaderboard-boards">
        ${leaderboardTableMarkup("积分最高", "score", boards.score, "暂无积分记录。")}
        ${leaderboardTableMarkup("通关时长最短", "time", boards.time, "暂无竞速记录。")}
        ${leaderboardTableMarkup("只使用圣剑通关", "sword", boards.sword, "暂无圣剑通关记录。")}
      </div>
      <p class="leaderboard-note">积分现在更重视时间：速度越快加分越高，超过 7 分钟后会继续扣分；清完六个房间仍有路线奖励，但拖太久会被超时惩罚压低。</p>
    `;
  }

  function openModal(kind) {
    const content = {
      guide: {
        title: "游戏说明",
        body: `
          <p>进入知识点房间可以获得武器和增益；直接进入 Boss 房只能携带初始圣剑 ∫，难度更高。</p>
          <ul>
            <li>W/A/S/D 控制移动</li>
            <li>鼠标移动控制攻击方向</li>
            <li>鼠标左键攻击，圣剑可以抵消敌方弹幕</li>
            <li>按 1-9 选择对应武器，按 Q 在已有武器间循环</li>
            <li>远程武器有弹匣限制，打空后自动换弹，也可以按 R 手动换弹</li>
            <li>重复获得同类武器时会强化现有武器，显示为 +1、+2 等等级</li>
            <li>击败 Boss 三个核心即可通关</li>
          </ul>
        `,
      },
      codex: {
        title: "知识图鉴",
        body: `
          <p>基础版已实装微积分、欧氏几何、线性代数、随机房和 Boss 房。</p>
          <ul>
            <li>拉格朗日投影：微积分怪物，发射函数弹幕。</li>
            <li>笛卡尔投影：欧氏几何怪物，发射坐标轴交叉弹幕。</li>
            <li>高斯投影：线性代数怪物，发射矩阵式弹幕墙。</li>
            <li>函数机枪：微积分武器，对柯西核心有克制伤害。</li>
            <li>极坐标霰弹枪：欧氏几何武器，对笛卡尔核心有克制伤害。</li>
            <li>矩阵 RPG：线性代数武器，对高斯核心有克制伤害。</li>
            <li>三位一体：拥有柯西、笛卡尔、高斯三个核心。</li>
          </ul>
        `,
      },
      weapons: {
        title: "武器数据",
        body: weaponStatsMarkup(),
      },
      inventory: {
        title: "背包",
        body: inventoryMarkup(),
      },
      leaderboard: {
        title: "通关排行榜",
        body: leaderboardMarkup(),
      },
      buffs: {
        title: "当前增益说明",
        body: buffInfoMarkup(),
      },
      settings: {
        title: "设置",
        body: `
          <p>基础版暂时采用固定难度和固定键位。后续可以继续加入音量、难度和画面设置。</p>
        `,
      },
    }[kind];
    ui.modal.dataset.kind = kind;
    ui.modalPanel.classList.toggle("modal-panel-wide", kind === "weapons" || kind === "inventory" || kind === "leaderboard");
    ui.modalTitle.textContent = content.title;
    ui.modalBody.innerHTML = content.body;
    ui.modal.hidden = false;
    if (kind === "leaderboard") {
      loadServerLeaderboard().then((entries) => {
        if (!ui.modal.hidden && ui.modal.dataset.kind === "leaderboard") {
          ui.modalBody.innerHTML = leaderboardMarkup(entries);
        }
      });
    }
  }

  function closeModal() {
    ui.modal.hidden = true;
  }

  function canvasMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function shouldIgnoreCombatPointer(event) {
    return Boolean(event.target.closest("button, .modal-backdrop, .screen, .hud-inventory-button"));
  }

  function updatePointerFromEvent(event, pressed = false) {
    if (mode !== "combat" || !ui.modal.hidden || shouldIgnoreCombatPointer(event)) return false;
    Object.assign(mouse, canvasMousePosition(event));
    if (pressed) {
      mouse.down = true;
      attackHeld = true;
      event.preventDefault();
    }
    return true;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function distancePointToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const lenSq = vx * vx + vy * vy;
    if (!lenSq) return Math.hypot(px - ax, py - ay);
    const t = clamp(((px - ax) * vx + (py - ay) * vy) / lenSq, 0, 1);
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }

  function angleDelta(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function smoothAngle(current, target, rate) {
    return current + angleDelta(target, current) * rate;
  }

  function isEnemyBackHit(enemy, source) {
    if (!enemy || !source || game.activeRoom !== "monster") return false;
    const facing = enemy.facingAngle ?? Math.PI / 2;
    const sourceAngle = Math.atan2(source.y - enemy.y, source.x - enemy.x);
    return Math.abs(angleDelta(sourceAngle, facing + Math.PI)) <= backHitHalfAngle;
  }

  function monsterHitDamage(baseDamage, enemy, source) {
    const backHit = isEnemyBackHit(enemy, source);
    return {
      amount: baseDamage * (backHit ? backHitMultiplier : 1),
      backHit,
    };
  }

  function circleRectCollision(circleRef, rect, radius = circleRef.r || 0) {
    const nearestX = clamp(circleRef.x, rect.x, rect.x + rect.w);
    const nearestY = clamp(circleRef.y, rect.y, rect.y + rect.h);
    return Math.hypot(circleRef.x - nearestX, circleRef.y - nearestY) <= radius;
  }

  function circleObstacleCollision(circleRef, obstacle, radius = circleRef.r || 0) {
    return Boolean(circleObstacleHit(circleRef, obstacle, radius));
  }

  function circleObstacleHit(circleRef, obstacle, radius = circleRef.r || 0) {
    if (!circleRectCollision(circleRef, expandRect(obstacle, Math.max(radius, obstacle.thickness || 0)), 0)) {
      return null;
    }

    if (!obstacle.shape || obstacle.shape === "rect") {
      const nearestX = clamp(circleRef.x, obstacle.x, obstacle.x + obstacle.w);
      const nearestY = clamp(circleRef.y, obstacle.y, obstacle.y + obstacle.h);
      const dist = Math.hypot(circleRef.x - nearestX, circleRef.y - nearestY);
      return dist <= radius ? { nearestX, nearestY, distance: dist, collisionRadius: radius } : null;
    }

    if (obstacle.shape === "line" || obstacle.shape === "curve") {
      const hitRadius = radius + (obstacle.thickness || 8) / 2;
      const nearest = nearestPointOnPolyline(circleRef, obstacle.points || []);
      return nearest && nearest.distance <= hitRadius
        ? { nearestX: nearest.x, nearestY: nearest.y, distance: nearest.distance, collisionRadius: hitRadius }
        : null;
    }

    if (obstacle.shape === "blob") {
      const points = obstacle.points || [];
      const nearest = nearestPointOnPolyline(circleRef, [...points, points[0]].filter(Boolean));
      const inside = pointInPolygon(circleRef, points);
      if (inside) {
        const center = obstacleCenter(obstacle);
        return { nearestX: center.x, nearestY: center.y, distance: 0, collisionRadius: radius + 1 };
      }
      return nearest && nearest.distance <= radius
        ? { nearestX: nearest.x, nearestY: nearest.y, distance: nearest.distance, collisionRadius: radius }
        : null;
    }

    return null;
  }

  function obstacleCenter(obstacle) {
    if (obstacle.points?.length) {
      return {
        x: obstacle.points.reduce((sum, point) => sum + point.x, 0) / obstacle.points.length,
        y: obstacle.points.reduce((sum, point) => sum + point.y, 0) / obstacle.points.length,
      };
    }
    return { x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2 };
  }

  function obstacleVisualArea(obstacle) {
    if (obstacle.shape === "line" || obstacle.shape === "curve") {
      const points = obstacle.points || [];
      let length = 0;
      for (let i = 0; i < points.length - 1; i += 1) {
        length += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      }
      return length * (obstacle.thickness || 8);
    }
    if (obstacle.shape === "blob") {
      const points = obstacle.points || [];
      let area = 0;
      for (let i = 0; i < points.length; i += 1) {
        const next = points[(i + 1) % points.length];
        area += points[i].x * next.y - next.x * points[i].y;
      }
      return Math.abs(area) / 2;
    }
    return obstacle.w * obstacle.h;
  }

  function nearestPointOnPolyline(point, points) {
    if (!points || points.length < 2) return null;
    let best = null;
    for (let i = 0; i < points.length - 1; i += 1) {
      const candidate = nearestPointOnSegment(point.x, point.y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      if (!best || candidate.distance < best.distance) best = candidate;
    }
    return best;
  }

  function nearestPointOnSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const lenSq = vx * vx + vy * vy;
    if (!lenSq) {
      return { x: ax, y: ay, distance: Math.hypot(px - ax, py - ay) };
    }
    const t = clamp(((px - ax) * vx + (py - ay) * vy) / lenSq, 0, 1);
    const x = ax + vx * t;
    const y = ay + vy * t;
    return { x, y, distance: Math.hypot(px - x, py - y) };
  }

  function pointInPolygon(point, points) {
    if (!points || points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const a = points[i];
      const b = points[j];
      const crosses = (a.y > point.y) !== (b.y > point.y)
        && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1) + a.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function expandRect(rect, amount) {
    return {
      x: rect.x - amount,
      y: rect.y - amount,
      w: rect.w + amount * 2,
      h: rect.h + amount * 2,
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function inBounds(x, y, margin) {
    return x > -margin && x < W + margin && y > -margin && y < H + margin;
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
  }

  ui.start.addEventListener("click", resetGame);
  hud.inventory?.addEventListener("click", () => openModal("inventory"));
  ui.guide.addEventListener("click", () => openModal("guide"));
  ui.codex.addEventListener("click", () => openModal("codex"));
  ui.weaponStats.addEventListener("click", () => openModal("weapons"));
  ui.leaderboard?.addEventListener("click", () => openModal("leaderboard"));
  ui.settings.addEventListener("click", () => openModal("settings"));
  ui.modalClose.addEventListener("click", closeModal);
  ui.modal.addEventListener("click", (event) => {
    if (event.target === ui.modal) closeModal();
  });
  [ui.monsterRoom, ui.chestRoom, ui.geometryRoom, ui.linearRoom, ui.randomRoomB, ui.randomRoomC, ui.bossRoom].forEach((door) => {
    door.tabIndex = -1;
  });
  ui.challengeOptions.forEach((button) => {
    button.addEventListener("click", () => beginMonsterChallenge(button.dataset.challengeCount));
  });
  ui.challengeBack?.addEventListener("click", () => enterMap("当前状态：已返回地图，可以重新选择教室。"));
  ui.acceptWeapon?.addEventListener("click", () => resolveWeaponChoice(true));
  ui.skipWeapon?.addEventListener("click", () => resolveWeaponChoice(false));
  ui.backToMap.addEventListener("click", () => enterMap("当前状态：奖励已整理，可以继续选择房间或挑战 Boss。"));
  ui.resume.addEventListener("click", () => {
    mode = "combat";
    showScreen("combat");
  });
  ui.pauseMenu.addEventListener("click", () => {
    mode = "menu";
    showScreen("menu");
    if (hud.root) hud.root.hidden = true;
  });
  ui.leaderboardNameForm?.addEventListener("submit", submitLeaderboardName);
  ui.restart.addEventListener("click", resetGame);
  ui.resultLeaderboard?.addEventListener("click", () => openModal("leaderboard"));
  ui.menu.addEventListener("click", () => {
    mode = "menu";
    showScreen("menu");
    if (hud.root) hud.root.hidden = true;
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      if (!ui.modal.hidden) {
        closeModal();
      } else if (mode === "combat") {
        mode = "paused";
        showScreen("pause");
      } else if (mode === "paused") {
        mode = "combat";
        showScreen("combat");
      }
      return;
    }
    if (mode === "map" && ui.modal.hidden) {
      if (event.code === "KeyE") {
        event.preventDefault();
        enterNearbyMapDoor();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) dashMapPlayer();
        return;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
        keys.add(event.code);
        return;
      }
    }
    if (event.code === "KeyB") {
      event.preventDefault();
      if (!game.player) return;
      if (!ui.modal.hidden && ui.modal.dataset.kind === "inventory") {
        closeModal();
      } else {
        openModal("inventory");
      }
      return;
    }
    if (!ui.modal.hidden) return;
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) dashCombatPlayer();
      return;
    }
    if (event.code.startsWith("Digit")) {
      const index = Number(event.code.replace("Digit", "")) - 1;
      if (Number.isInteger(index) && index >= 0) setWeaponIndex(index);
      return;
    }
    if (event.code === "KeyQ") {
      cycleWeapon();
      return;
    }
    if (event.code === "KeyR") {
      startReload(game.player?.weapon);
      updateHud();
      return;
    }
    keys.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  ui.shell.addEventListener("mousemove", (event) => {
    updatePointerFromEvent(event);
  });
  ui.shell.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    updatePointerFromEvent(event, true);
  });
  window.addEventListener("mouseup", () => {
    mouse.down = false;
    attackHeld = false;
  });

  canvas.addEventListener("touchmove", (event) => {
    if (!event.touches.length) return;
    Object.assign(mouse, canvasMousePosition(event.touches[0]));
  }, { passive: true });
  canvas.addEventListener("touchstart", (event) => {
    if (!event.touches.length) return;
    Object.assign(mouse, canvasMousePosition(event.touches[0]));
    mouse.down = true;
    attackHeld = true;
  }, { passive: true });
  window.addEventListener("touchend", () => {
    mouse.down = false;
    attackHeld = false;
  });

  const debugApi = {
    resetGame,
    startMonsterRoom,
    openChestRoom,
    startBossRoom,
    startRandomRoom,
    openChallengeSelect,
    beginMonsterChallenge,
    completeActiveRoom() {
      if (game.activeRoom === "monster" && game.enemies.length) {
        game.enemies.forEach((enemy) => {
          enemy.hp = 0;
        });
        updateMonsterRoom(0);
      }
      return this.state();
    },
    drainCurrentWeapon() {
      const weapon = game.player?.weapon;
      if (weapon && !weapon.infiniteAmmo) {
        weapon.ammo = 0;
        startReload(weapon);
      }
      updateHud();
      return this.state();
    },
    grantBuffForVerify(name) {
      if (game.player) {
        grantBuff(game.player, name);
      }
      updateHud();
      return this.state();
    },
    tickPassiveForVerify(seconds) {
      updatePassiveShield(Number(seconds) || 0);
      updateHud();
      return this.state();
    },
    damagePlayerForVerify(amount) {
      const before = {
        hp: game.player?.hp,
        blockCharges: game.player?.blockCharges || 0,
      };
      applyPlayerDamage(Number(amount) || 0, colors.danger);
      updateHud();
      return { before, after: this.state() };
    },
    acceptPendingWeaponForVerify() {
      resolveWeaponChoice(true);
      return this.state();
    },
    skipPendingWeaponForVerify() {
      resolveWeaponChoice(false);
      return this.state();
    },
    addWeaponForVerify(id) {
      const added = addWeapon(game.player, id, true);
      if (added) rememberRewardFamily(id);
      updateHud();
      return this.state();
    },
    addLeaderboardEntry(entry) {
      saveLeaderboardEntry(entry);
      return this.state();
    },
    prepareLeaderboardNameForVerify(entry) {
      const normalized = normalizeLeaderboardEntry(entry);
      if (!normalized) return this.state();
      const updated = saveLeaderboardEntry(normalized);
      const ranks = leaderboardRanksForEntry(normalized, updated);
      if (ranks.length) showLeaderboardNameForm(normalized, ranks);
      return this.state();
    },
    submitLeaderboardNameForVerify(name) {
      if (ui.leaderboardNameInput) ui.leaderboardNameInput.value = name;
      submitLeaderboardName();
      return this.state();
    },
    setPlayerHp(value) {
      if (game.player) {
        game.player.hp = clamp(Number(value) || game.player.hp, 1, game.player.maxHp);
      }
      updateHud();
      return this.state();
    },
    setBossCoreHp(id, value) {
      const core = game.boss?.cores.find((item) => item.id === id);
      if (core) {
        core.hp = Number(value);
        updateBossDeaths(game.boss);
      }
      return this.state();
    },
    damageBossCoreForVerify(id, amount) {
      const core = game.boss?.cores.find((item) => item.id === id);
      if (!core) return null;
      const before = Math.max(0, core.hp);
      damageBossCore(core, Number(amount) || 0);
      return {
        id,
        front: isBossCoreFront(core),
        before,
        after: Math.max(0, core.hp),
        state: this.state(),
      };
    },
    bossKindMultiplierForVerify(kind, id) {
      const core = game.boss?.cores.find((item) => item.id === id);
      if (!core) return 0;
      return bossKindMultiplier(kind, core);
    },
    weaponBalanceForVerify() {
      return Object.fromEntries(Object.entries(weapons).map(([id, weapon]) => [id, weaponTheory({ ...weapon, level: 1 })]));
    },
    dropModelForVerify,
    scoreForVerify(options = {}) {
      const previous = {
        kills: game.kills,
        weaponsFound: game.weaponsFound,
        usedNonSwordWeapon: game.usedNonSwordWeapon,
        completed: { ...game.completed },
        hp: game.player?.hp,
        maxHp: game.player?.maxHp,
      };
      const completedKeys = new Set(options.completedKeys || []);
      Object.keys(game.completed).forEach((key) => {
        game.completed[key] = completedKeys.has(key);
      });
      game.kills = Math.max(0, Math.round(Number(options.kills ?? game.kills)));
      game.weaponsFound = Math.max(1, Math.round(Number(options.weaponsFound ?? game.weaponsFound)));
      game.usedNonSwordWeapon = Boolean(options.usedNonSwordWeapon);
      const player = game.player || { hp: 100, maxHp: 100 };
      player.maxHp = Math.max(1, Math.round(Number(options.maxHp ?? player.maxHp ?? 100)));
      player.hp = clamp(Number(options.hp ?? player.hp ?? player.maxHp), 0, player.maxHp);
      const score = calculateClearScore(Math.max(1, Math.round(Number(options.seconds || 1))), player);
      game.kills = previous.kills;
      game.weaponsFound = previous.weaponsFound;
      game.usedNonSwordWeapon = previous.usedNonSwordWeapon;
      game.completed = previous.completed;
      if (game.player) {
        game.player.hp = previous.hp;
        game.player.maxHp = previous.maxHp;
      }
      return score;
    },
    forceBossMechanic(kind) {
      const boss = game.boss;
      if (!boss) return this.state();
      if (kind === "weak") boss.weakCooldown = 0;
      if (kind === "ultimate" && boss.ultimate) boss.ultimate.timer = 0;
      if (kind === "obstacle") boss.obstacleTimer = 0;
      if (kind === "combo") boss.comboTimer = 0;
      return this.state();
    },
    state: () => ({
      mode,
      activeRoom: game.activeRoom,
      activeRoomKey: game.activeRoomKey,
      hp: game.player?.hp,
      shield: game.player?.shield || 0,
      blockCharges: game.player?.blockCharges || 0,
      blockTimer: game.player?.blockTimer || 0,
      mistakeBoostTimer: game.player?.mistakeBoostTimer || 0,
      gpaGuardUsed: Boolean(game.player?.gpaGuardUsed),
      weapon: game.player?.weapon ? displayWeaponName(game.player.weapon) : "",
      currentWeaponId: game.player?.weapon?.id || "",
      currentWeaponAmmo: game.player?.weapon && !game.player.weapon.infiniteAmmo ? game.player.weapon.ammo : null,
      currentWeaponMagazine: game.player?.weapon && !game.player.weapon.infiniteAmmo ? game.player.weapon.magazine : null,
      currentWeaponReloading: Boolean(game.player?.weapon?.reloading),
      weaponIndex: game.player?.weaponIndex || 0,
      ammo: game.player?.weapon ? ammoLabel(game.player.weapon) : "",
      weaponLevel: game.player?.weapon?.level || 0,
      weaponDamage: game.player?.weapon ? game.player.weapon.damage * weaponDamageScale(game.player.weapon) : 0,
      weaponSlashRadius: game.player?.weapon?.slashRadius || swordSlashRadius,
      weaponSlashReach: game.player?.weapon?.slashReach || swordSlashReach,
      directBossSwordAwakened: Boolean(game.player?.weapons?.some((weapon) => weapon.id === "sword" && weapon.directBossAwakened)),
      playerDamageScale,
      movementSpeedMultiplier: game.player ? movementSpeedMultiplier(game.player) : 1,
      bossDamageScale,
      weapons: game.player?.weapons.map((weapon) => displayWeaponName(weapon)) || [],
      weaponIds: game.player?.weapons.map((weapon) => weapon.id) || [],
      buffs: game.player?.buffs ? [...game.player.buffs] : [],
      leaderboard: readLeaderboard(),
      leaderboardBoards: Object.fromEntries(Object.entries(leaderboardRankings()).map(([kind, rows]) => [kind, rows.length])),
      pendingWeaponChoice: Boolean(game.pendingWeaponChoice),
      pendingWeaponId: game.pendingWeaponChoice?.weaponId || "",
      pendingAltBuff: game.pendingWeaponChoice?.altBuff || "",
      pendingWeaponName: game.pendingWeaponChoice ? weaponChoiceName(game.pendingWeaponChoice.weaponId) : "",
      pendingLeaderboardEntry: Boolean(game.pendingLeaderboardEntry),
      leaderboardNameFormHidden: Boolean(ui.leaderboardNameForm?.hidden),
      usedNonSwordWeapon: game.usedNonSwordWeapon,
      recentRewardFamilies: [...(game.recentRewardFamilies || [])],
      swordOnlyRun: game.player ? isSwordOnlyRun() : false,
      kills: game.kills,
      completed: { ...game.completed },
      pendingChallenge: Boolean(game.pendingChallenge),
      challengeCount: game.challengeCount,
      defeatedInRoom: game.defeatedInRoom,
      enemyCount: game.enemies.length,
      obstacleCount: game.obstacles.length,
      obstacleRects: game.obstacles.map((obstacle) => ({
        shape: obstacle.shape || "rect",
        x: Math.round(obstacle.x),
        y: Math.round(obstacle.y),
        w: Math.round(obstacle.w),
        h: Math.round(obstacle.h),
        area: Math.round(obstacleVisualArea(obstacle)),
        broken: Boolean(obstacle.broken),
        marked: Boolean(obstacle.marked),
      })),
      bossAttackTypes: game.boss?.cores.map((core) => core.attack) || [],
      bossPhase: game.boss?.phaseName || "",
      bossX: game.boss?.x || 0,
      bossMoveBaseX: game.boss?.moveBaseX || 0,
      bossMoveOffset: game.boss ? game.boss.x - game.boss.moveBaseX : 0,
      bossMoveT: game.boss?.moveT || 0,
      bossRotationSteps: game.boss?.rotationSteps || 0,
      bossComboCount: game.boss?.comboCount || 0,
      bossComboType: game.boss?.comboType || "",
      bossLaserCount: game.boss?.laserCount || 0,
      bossShotPatternCounts: game.boss?.shotPatternCounts ? { ...game.boss.shotPatternCounts } : {},
      bossDefeatedCount: game.boss?.defeatedCount || 0,
      bossCoreHp: game.boss?.cores.map((core) => Math.max(0, Math.ceil(core.hp))) || [],
      bossCoreShield: game.boss?.cores.map((core) => Math.max(0, Math.ceil(core.shield || 0))) || [],
      bossFrontCoreIds: game.boss ? bossFrontCoreIds(game.boss) : [],
      bossInvulnerableCoreIds: game.boss ? game.boss.cores.filter((core) => core.hp > 0 && !isBossCoreFront(core, game.boss)).map((core) => core.id) : [],
      bossActiveCoreCount: game.boss ? bossActiveCores(game.boss).length : 0,
      bossWeakCore: game.boss?.weakCoreId || "",
      bossWeakTimer: game.boss?.weakTimer || 0,
      bossInheritedCoreIds: game.boss?.inheritedCoreIds ? [...game.boss.inheritedCoreIds] : [],
      bossInheritedCount: game.boss?.inheritedCount || 0,
      bossObstacleBoomCount: game.boss?.obstacleBoomCount || 0,
      bossUltimateState: game.boss?.ultimate?.state || "",
      bossUltimateCount: game.boss?.ultimate?.count || 0,
      bossUltimateFiredCount: game.boss?.ultimate?.firedCount || 0,
      bossUltimateInterruptedCount: game.boss?.ultimate?.interruptedCount || 0,
      bossUltimateDamageTaken: game.boss?.ultimate?.damageTaken || 0,
      bossDirect: Boolean(game.boss?.direct),
      bossIntroActive: isBossIntroActive(),
      bossIntroElapsed: game.boss?.intro?.elapsed || 0,
      enemyShotPatterns: game.enemyShots.map((shot) => shot.pattern || "straight"),
      enemyLaserCount: game.enemyLasers.length,
      activeLaserCount: game.enemyLasers.filter(isLaserActive).length,
    }),
  };

  if (["localhost", "127.0.0.1", ""].includes(window.location.hostname)) {
    window.__examGame = debugApi;
  }

  showScreen("menu");
  requestAnimationFrame((now) => {
    lastTime = now;
    draw();
  });
})();
