(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const screens = {
    menu: document.getElementById("mainMenu"),
    version: document.getElementById("versionSelectScreen"),
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
    versionAlpha: document.getElementById("versionAlphaBtn"),
    versionBeta: document.getElementById("versionBetaBtn"),
    versionBack: document.getElementById("versionBackBtn"),
    weaponStats: document.getElementById("weaponStatsBtn"),
    enemyCodex: document.getElementById("enemyCodexBtn"),
    funFacts: document.getElementById("funFactsBtn"),
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
    weaponChoiceBuffText: document.getElementById("weaponChoiceBuffText"),
    acceptWeapon: document.getElementById("acceptWeaponBtn"),
    skipWeapon: document.getElementById("skipWeaponBtn"),
    secondBuffReward: document.getElementById("secondBuffRewardBtn"),
    confirmReward: document.getElementById("confirmRewardBtn"),
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

  const coreConfig = window.ExamGameCore || {};
  const colors = coreConfig.colors || {};
  const {
    leaderboardScoreVersion,
    leaderboardStorageKey,
    leaderboardLimit,
    defaultLeaderboardName,
    randomRoomMonsterChance,
    randomRoomChestChance,
    completedRoomKeys,
    characterSizeScale,
    playerDamageScale,
    bossDamageScale,
    bossSizeScale,
    bossCoreOrbitRadius,
    bossCoreHitRadius,
    bossDomainCycleSeconds,
    bossInitialObstacleCount,
    cauchyDotDuration,
    cauchyDotDps,
    cauchyDomainWallCount,
    cauchyHighlightEvery,
    cauchyExplosionBulletCount,
    cauchyFullPowerWallCount,
    cauchyFullPowerCycle,
    bossProjectionHp,
    gaussZoneBaseCount,
    gaussZoneResetCount,
    gaussZoneMaxCount,
    gaussZoneDuration,
    gaussZoneFireEvery,
    gaussZoneDebuffDuration,
    bossCoreInvisibleDuration,
    bossCoreRevealDuration,
    gaussFullPowerStealthEvery,
    gaussFullPowerStealthDuration,
    descartesFullPowerSpawnEvery,
    backHitMultiplier,
    backHitHalfAngle,
    swordSlashReach,
    swordSlashRadius,
    directBossSwordDamage,
    directBossSwordReach,
    directBossSwordRadius,
    obstacleAreaMultiplier,
    obstacleThinnessScale,
    obstacleLengthScale,
    obstacleMinThickness,
    obstacleMaxThickness,
    monsterShieldDuration,
    weaponSealDuration,
    enemySlowDuration,
    enemySlowMultiplier,
    jordanDomainRadius,
    jordanDomainTickEvery,
    gaussDeathBeamClearDelay,
  } = coreConfig.gameplayConstants || {};
  const {
    angleDelta,
    circleObstacleCollision,
    circleObstacleHit,
    clamp,
    distance,
    distancePointToSegment,
    expandRect,
    obstacleCenter,
    obstacleVisualArea,
    rectsOverlap,
    smoothAngle,
  } = window.ExamGameUtils || {};
  if (!Object.keys(colors).length || !clamp || !distance) {
    throw new Error("Game modules did not load correctly. Check script order in templates/index.html.");
  }
  const keys = new Set();
  const mouse = { x: W / 2, y: H / 2, down: false };
  let mode = "menu";
  let lastTime = performance.now();
  let attackHeld = false;
  let lastFunStatsFetch = 0;
  let sharedFunStats = null;
  let funFactsPageIndex = 0;
  let weaponInfoPageIndex = 0;
  const chickenHotpotDelayMs = 20000;
  const lagrangeChildHpMultiplier = 0.4;
  const lagrangeChildShotSpeedMultiplier = 1.5;
  const lhopitalInvincibleDuration = 5;
  const lhopitalRestDuration = 3;
  const lhopitalEnragedRestDuration = 2;
  const taylorRestDuration = 4;
  const archimedesDashWarning = 1.7;
  const archimedesPlayerLockWarning = 1;
  const archimedesWallDashLimit = 2;
  const betaRandomRoomCost = 2;
  const betaShopItemHpCost = 30;
  const jordanSlashWarnDuration = 0.7;
  const jordanSlashRadiusScale = 2 / 3;
  const jordanSlashDamage = 14;

  function weaponDamageScale(weapon) {
    return weapon?.id === "sword" ? 1 : playerDamageScale;
  }

  function playerAttackCooldownMultiplier(player = game.player) {
    const formulaMultiplier = hasBuff(player, "公式大全") ? 1 / 1.2 : 1;
    return bossDomainAttackCooldownMultiplier() * formulaMultiplier;
  }

  function playerDamageBuffMultiplier(player = game.player) {
    return (
      (hasBuff(player, "学霸笔记") ? 1.2 : 1) *
      (player?.mistakeBoostTimer > 0 ? 1.25 : 1) *
      (hasBuff(player, "鸡煲") && game.elapsed >= chickenHotpotDelayMs ? 2 : 1)
    );
  }

  function incomingDamageMultiplier(player = game.player) {
    return hasBuff(player, "错题本") ? 0.75 : 1;
  }

  function weaponReloadTime(weapon, player = game.player) {
    const baseReloadTime = Number(weapon?.reloadTime || 0);
    return hasBuff(player, "草稿纸") ? baseReloadTime * 0.5 : baseReloadTime;
  }

  const game = {
    versionChannel: "alpha",
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
    monsterClearDelay: 0,
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
    developerMode: false,
    developerModeUsed: false,
    developerCustomMessage: "",
    credits: 0,
    betaBossShop: {
      entered: false,
      stock: [],
      refreshCost: 1,
      message: "",
      sequence: 0,
    },
  };

  function recordBossWeaponDamage(weaponId, weaponName, amount) {
    const boss = game.boss;
    const damage = Math.max(0, Number(amount || 0));
    if (!boss || game.activeRoom !== "boss" || !weaponId || damage <= 0) return;
    boss.weaponDamage ||= {};
    boss.weaponDamageNames ||= {};
    boss.weaponDamage[weaponId] = (boss.weaponDamage[weaponId] || 0) + damage;
    boss.weaponDamageNames[weaponId] = weaponName || weapons[weaponId]?.name || weaponId;
  }

  function topBossDamageWeapon(boss = game.boss) {
    const entries = Object.entries(boss?.weaponDamage || {})
      .filter(([, damage]) => Number(damage) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0]), "zh-CN"));
    const [id, damage] = entries[0] || [];
    if (!id) return { id: "", name: "", damage: 0 };
    return {
      id,
      name: boss?.weaponDamageNames?.[id] || weapons[id]?.name || id,
      damage: Math.round(Number(damage || 0) * 10) / 10,
    };
  }

  const dataConfig = window.ExamGameData || {};
  const weapons = dataConfig.createWeapons?.({ baseStats, colors }) || {};
  const chestWeaponIds = [...(dataConfig.chestWeaponIds || [])];
  const buffRewardIds = [...(dataConfig.buffRewardIds || [])];
  const buffDetails = dataConfig.buffDetails || {};
  const monsterRooms = dataConfig.createMonsterRooms?.({ baseStats, colors }) || {};
  const randomMonsterPool = dataConfig.createRandomMonsterPool?.({ colors }) || [];
  if (!Object.keys(weapons).length || !chestWeaponIds.length || !buffRewardIds.length || !Object.keys(monsterRooms).length || !randomMonsterPool.length) {
    throw new Error("Game data modules did not load correctly. Check script order in templates/index.html.");
  }

  function cloneWeapon(id) {
    const weaponTemplate = weapons[id];
    if (!weaponTemplate) return null;
    const weapon = { ...weaponTemplate };
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

  function isBetaVersion() {
    return game.versionChannel === "beta";
  }

  function isKnowledgeCreditRoomKey(roomKey) {
    return ["monster", "geometry", "linear"].includes(roomKey);
  }

  function isBetaRandomRoomKey(roomKey) {
    return ["chest", "randomB", "randomC"].includes(roomKey);
  }

  function sampleUnique(items, count) {
    const pool = [...items];
    const picked = [];
    while (pool.length && picked.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  function resetBetaBossShop() {
    game.betaBossShop = {
      entered: false,
      stock: [],
      refreshCost: 1,
      message: "",
      sequence: 0,
    };
  }

  function createBetaBossShopStock() {
    const shop = game.betaBossShop;
    shop.sequence = (shop.sequence || 0) + 1;
    const weaponItems = sampleUnique(chestWeaponIds, 2).map((id, index) => ({
      key: `weapon-${shop.sequence}-${index}-${id}`,
      type: "weapon",
      id,
      purchased: false,
    }));
    const buffItems = sampleUnique(buffRewardIds, 2).map((id, index) => ({
      key: `buff-${shop.sequence}-${index}-${id}`,
      type: "buff",
      id,
      purchased: false,
    }));
    return [...weaponItems, ...buffItems];
  }

  function ensureBetaBossShopStock(force = false) {
    if (!game.betaBossShop) resetBetaBossShop();
    if (force || !Array.isArray(game.betaBossShop.stock) || !game.betaBossShop.stock.length) {
      game.betaBossShop.stock = createBetaBossShopStock();
    }
    game.betaBossShop.refreshCost = Math.max(1, Math.round(Number(game.betaBossShop.refreshCost || 1)));
    return game.betaBossShop;
  }

  function betaShopItemName(item) {
    if (!item) return "";
    return item.type === "weapon" ? weaponChoiceName(item.id) : item.id;
  }

  function rerenderBetaShopModal() {
    updateMap();
    updateHud();
    if (!ui.modal.hidden && ui.modal.dataset.kind === "betaShop") {
      ui.modalBody.innerHTML = betaBossShopMarkup();
    }
  }

  function awardBetaKnowledgeCredits(roomKey, count) {
    if (!isBetaVersion() || !isKnowledgeCreditRoomKey(roomKey)) return 0;
    const gained = clamp(Math.round(Number(count) || 0), 0, 3);
    game.credits = Math.max(0, Math.round(Number(game.credits || 0))) + gained;
    return gained;
  }

  function chargeBetaRandomRoom(roomKey) {
    if (!isBetaVersion() || !isBetaRandomRoomKey(roomKey) || game.randomRooms[roomKey]) return true;
    if ((game.credits || 0) < betaRandomRoomCost) {
      game.message = `β 测试服：开启右侧随机教室需要 ${betaRandomRoomCost} 学分，当前 ${game.credits || 0} 学分。`;
      updateMap();
      return false;
    }
    game.credits -= betaRandomRoomCost;
    game.message = `β 测试服：已消耗 ${betaRandomRoomCost} 学分开启随机教室，剩余 ${game.credits} 学分。`;
    updateMap();
    return true;
  }

  function openBetaBossShop() {
    if (!isBetaVersion()) return false;
    const shop = ensureBetaBossShopStock();
    if (!shop.entered) {
      const recovered = restoreMissingHpOnRoomEnter(game.player);
      shop.entered = true;
      shop.refreshCost = 1;
      shop.stock = createBetaBossShopStock();
      shop.message = recovered > 0
        ? `进入 Boss 前商店，已先回复 ${Math.ceil(recovered)} 点生命；之后开始 Boss 战不会再次回血。`
        : "进入 Boss 前商店；之后开始 Boss 战不会再次回血。";
    }
    game.message = `β 测试服：Boss 前商店已开启，当前 ${game.credits || 0} 学分。`;
    updateMap();
    openModal("betaShop");
    return true;
  }

  function buyBetaShopItem(index) {
    const shop = ensureBetaBossShopStock();
    const item = shop.stock[Number(index)];
    if (!item || item.purchased) return false;
    if (!game.player || game.player.hp <= betaShopItemHpCost) {
      shop.message = `生命不足：每项需要 ${betaShopItemHpCost} 生命，至少要保留 1 点生命。`;
      rerenderBetaShopModal();
      return false;
    }

    game.player.hp = Math.max(1, game.player.hp - betaShopItemHpCost);
    if (item.type === "weapon") {
      const added = addWeapon(game.player, item.id, true);
      if (added) rememberRewardFamily(item.id);
    } else if (item.type === "buff") {
      grantBuff(game.player, item.id);
    }
    item.purchased = true;
    shop.message = `已用 ${betaShopItemHpCost} 生命兑换 ${betaShopItemName(item)}。`;
    rerenderBetaShopModal();
    return true;
  }

  function refreshBetaBossShop() {
    const shop = ensureBetaBossShopStock();
    const cost = Math.max(1, Math.round(Number(shop.refreshCost || 1)));
    if ((game.credits || 0) < cost) {
      shop.message = `学分不足：本次刷新需要 ${cost} 学分，当前 ${game.credits || 0} 学分。`;
      rerenderBetaShopModal();
      return false;
    }
    game.credits -= cost;
    shop.refreshCost = cost + 1;
    shop.stock = createBetaBossShopStock();
    shop.message = `已消耗 ${cost} 学分刷新商店；下次刷新需要 ${shop.refreshCost} 学分。`;
    rerenderBetaShopModal();
    return true;
  }

  function startBossFromBetaShop() {
    const skipRestore = Boolean(game.betaBossShop?.entered);
    closeModal();
    return startBossRoom({ bypassShop: true, skipRestore });
  }

  function randomMonsterRoomChoices() {
    return ["monster", "geometry", "linear"]
      .map((key) => monsterRooms[key])
      .filter(Boolean);
  }

  function randomMonsterFamilyGroups() {
    return randomMonsterRoomChoices().reduce((groups, room) => {
      const family = canonicalWeaponFamily(room.rewardWeapon || room.enemy?.rewardWeapon);
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family).push(room);
      return groups;
    }, new Map());
  }

  function pickRandomMonsterRoomTemplate() {
    const groups = randomMonsterFamilyGroups();
    const family = weightedPick(Array.from(groups.keys()), recentFamilyWeight);
    const rooms = groups.get(family) || randomMonsterRoomChoices();
    return rooms[Math.floor(Math.random() * rooms.length)];
  }

  function developerCustomEnemyDefs() {
    const byName = new Map();
    Object.values(monsterRooms).forEach((room) => {
      if (room?.enemy?.name && !byName.has(room.enemy.name)) byName.set(room.enemy.name, room.enemy);
    });
    randomMonsterPool.forEach((enemy) => {
      if (enemy?.name && !byName.has(enemy.name)) byName.set(enemy.name, enemy);
    });
    return Array.from(byName.values());
  }

  function isDeveloperCustomRoom() {
    return game.activeRoomKey === "__developerCustom";
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
      randomRoomChances: {
        monster: randomRoomMonsterChance,
        chest: randomRoomChestChance,
      },
      recentRewardFamilies: [...(game.recentRewardFamilies || [])],
    };
  }

  function createPlayer() {
    const startingWeapon = cloneWeapon("sword");
    return {
      x: W * 0.5,
      y: H * 0.72,
      r: 15 * characterSizeScale,
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
      weaponSealTimer: 0,
      weaponSealSourceId: "",
      enemySlowTimer: 0,
      enemySlowMultiplier: 1,
      cauchyDotTimer: 0,
      cauchyDotTick: 0,
      dashCooldown: 0,
      invuln: 0,
    };
  }

  function grantBuff(player, name) {
    if (!player || !name) return;
    if (!buffRewardIds.includes(name)) return;
    player.buffs.push(name);
    if (name === "临时抱佛脚") {
      const bonusHp = Math.max(1, Math.round(player.maxHp * 0.25));
      player.maxHp += bonusHp;
      player.hp = Math.min(player.maxHp, player.hp + bonusHp);
    }
    if (name === "绩点守护") {
      player.gpaGuardUsed = false;
    }
  }

  function restoreMissingHpOnRoomEnter(player = game.player) {
    if (!player) return 0;
    const missingHp = Math.max(0, (player.maxHp || 0) - (player.hp || 0));
    if (missingHp <= 0) return 0;
    const recovered = missingHp * 0.5;
    player.hp = Math.min(player.maxHp, player.hp + recovered);
    return recovered;
  }

  function hasBuff(player, name) {
    return Boolean(player?.buffs?.includes(name));
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
    if (newWeapon.special === "shieldPulse" && mode === "combat") {
      player.shieldTimer = newWeapon.shieldEvery || 8;
    }
    game.lastWeaponReward = { type: "new", weapon: newWeapon };
    game.weaponsFound = player.weapons.length;
    if (equip) setWeaponIndex(player.weapons.length - 1);
    return true;
  }

  function removeWeapon(player, weaponId) {
    if (!player?.weapons?.length) return false;
    const index = player.weapons.findIndex((weapon) => weapon.id === weaponId);
    if (index < 0) return false;
    const weapon = player.weapons[index];
    if ((weapon.level || 1) > 1) {
      weapon.level = Math.max(1, (weapon.level || 1) - 1);
      applyWeaponLevelStats(weapon);
      if (!weapon.infiniteAmmo) {
        weapon.ammo = Math.min(weapon.magazine, Math.max(0, weapon.ammo ?? weapon.magazine));
        if (weapon.reloading) weapon.reloadTimer = Math.min(weapon.reloadTimer || weapon.reloadTime, weapon.reloadTime);
      }
      game.weaponsFound = player.weapons.length;
      return true;
    }
    if (player.weapons.length <= 1) return false;
    let nextIndex = player.weaponIndex || 0;
    if (index < nextIndex) nextIndex -= 1;
    if (index === nextIndex) nextIndex = Math.min(index, player.weapons.length - 2);
    player.weapons.splice(index, 1);
    player.weaponIndex = clamp(nextIndex, 0, player.weapons.length - 1);
    player.weapon = player.weapons[player.weaponIndex];
    player.attackTimer = 0;
    game.weaponsFound = player.weapons.length;
    armPassiveShieldTimer(player);
    return true;
  }

  function removeBuff(player, name) {
    if (!player?.buffs?.length || !name) return false;
    const index = player.buffs.lastIndexOf(name);
    if (index < 0) return false;
    player.buffs.splice(index, 1);
    if (!hasBuff(player, "绩点守护")) player.gpaGuardUsed = false;
    return true;
  }

  function ensureDeveloperPlayer() {
    if (!game.player) resetGame();
    return game.player;
  }

  function setDeveloperMode(active, openPanel = true) {
    const player = ensureDeveloperPlayer();
    if (!player) return false;
    game.developerMode = Boolean(active);
    if (game.developerMode) {
      game.developerModeUsed = true;
      player.hp = Math.max(1, player.hp || Math.ceil(player.maxHp * 0.5));
      player.invuln = Math.max(player.invuln || 0, 0.25);
    }
    updateHud();
    if (openPanel) {
      if (game.developerMode) {
        openModal("developer");
      } else if (!ui.modal.hidden && ui.modal.dataset.kind === "developer") {
        closeModal();
      }
    }
    return game.developerMode;
  }

  function toggleDeveloperMode() {
    return setDeveloperMode(true, true);
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

  function rewardChoiceBuffIds(choice) {
    if (!choice) return [];
    const ids = Array.isArray(choice.buffIds)
      ? choice.buffIds
      : choice.altBuff
        ? [choice.altBuff]
        : [];
    return ids.filter(Boolean);
  }

  function buffBriefText(name) {
    const detail = buffDetails[name];
    const raw = String(detail?.short || detail?.effect || "获得一项战斗增益。").trim();
    const first = raw.split(/[。；;]/)[0] || raw;
    return first.length > 36 ? `${first.slice(0, 36)}…` : first;
  }

  function buffChoiceText(buffIds) {
    if (!buffIds.length) return "";
    return buffIds
      .map((name) => `${name}：${buffBriefText(name)}`)
      .join(" / ");
  }

  function grantRewardBuffs(buffIds) {
    buffIds.forEach((name) => grantBuff(game.player, name));
  }

  function rewardSelection(choice) {
    if (!choice) return { weapon: false, buffIndexes: [], buffIndex: null };
    const buffIds = rewardChoiceBuffIds(choice);
    if (typeof choice.selectedWeapon !== "boolean") choice.selectedWeapon = false;
    const indexes = Array.isArray(choice.selectedBuffIndexes)
      ? choice.selectedBuffIndexes
      : Number.isInteger(choice.selectedBuffIndex)
        ? [choice.selectedBuffIndex]
        : [];
    let normalizedIndexes = [...new Set(indexes)]
      .filter((index) => Number.isInteger(index) && Boolean(buffIds[index]))
      .sort((a, b) => a - b);
    if (!choice.allowWeaponWithBuff && normalizedIndexes.length > 1) {
      normalizedIndexes = normalizedIndexes.slice(0, 1);
    }
    choice.selectedBuffIndexes = normalizedIndexes;
    choice.selectedBuffIndex = normalizedIndexes.length ? normalizedIndexes[0] : null;
    if (!choice.weaponId) choice.selectedWeapon = false;
    return {
      weapon: Boolean(choice.selectedWeapon),
      buffIndexes: normalizedIndexes,
      buffIndex: choice.selectedBuffIndex,
    };
  }

  function selectedRewardBuffIds(choice) {
    const selection = rewardSelection(choice);
    const buffIds = rewardChoiceBuffIds(choice);
    return selection.buffIndexes.map((index) => buffIds[index]).filter(Boolean);
  }

  function toggleRewardWeaponSelection() {
    const choice = game.pendingWeaponChoice;
    if (!choice?.weaponId) return false;
    const selection = rewardSelection(choice);
    choice.selectedWeapon = !selection.weapon;
    if (choice.selectedWeapon && !choice.allowWeaponWithBuff) {
      choice.selectedBuffIndexes = [];
      choice.selectedBuffIndex = null;
    }
    updateWeaponChoiceUi();
    return true;
  }

  function toggleRewardBuffSelection(index) {
    const choice = game.pendingWeaponChoice;
    const buffIds = rewardChoiceBuffIds(choice);
    if (!choice || !buffIds[index]) return false;
    const selection = rewardSelection(choice);
    const selected = selection.buffIndexes.includes(index);
    choice.selectedBuffIndexes = selected
      ? selection.buffIndexes.filter((item) => item !== index)
      : choice.allowWeaponWithBuff
        ? [...selection.buffIndexes, index]
        : [index];
    if (choice.selectedBuffIndexes.length && choice.selectedWeapon && !choice.allowWeaponWithBuff) {
      choice.selectedWeapon = false;
    }
    updateWeaponChoiceUi();
    return true;
  }

  function updateWeaponChoiceUi() {
    const choice = game.pendingWeaponChoice;
    const buffIds = rewardChoiceBuffIds(choice);
    const hasWeapon = Boolean(choice?.weaponId);
    const hasBuff = buffIds.length > 0;
    const selection = rewardSelection(choice);
    const hasSelection = Boolean(selection.weapon || selection.buffIndexes.length);
    if (ui.weaponChoice) ui.weaponChoice.hidden = !choice;
    if (ui.weaponChoiceName) {
      ui.weaponChoiceName.textContent = choice
        ? choice.title || (hasWeapon ? `发现武器：${weaponChoiceName(choice.weaponId)}` : "发现增益")
        : "";
    }
    if (ui.weaponChoiceBuffText) {
      ui.weaponChoiceBuffText.hidden = !hasBuff;
      ui.weaponChoiceBuffText.textContent = hasBuff ? buffChoiceText(buffIds) : "";
    }
    if (ui.acceptWeapon) {
      ui.acceptWeapon.hidden = !hasWeapon;
      ui.acceptWeapon.textContent = selection.weapon
        ? `已选：${choice?.weaponShortLabel || "武器"}`
        : choice?.acceptLabel || choice?.weaponShortLabel || "武器";
      ui.acceptWeapon.disabled = !choice || !hasWeapon;
      ui.acceptWeapon.classList.toggle("selected", selection.weapon);
    }
    if (ui.skipWeapon) {
      ui.skipWeapon.hidden = !hasBuff;
      const label = buffIds.length > 1 ? `增益A：${buffIds[0]}` : choice?.buffLabel || choice?.skipLabel || `增益：${buffIds[0]}`;
      ui.skipWeapon.textContent = selection.buffIndexes.includes(0) ? `已选：${label}` : label;
      ui.skipWeapon.disabled = !choice || !hasBuff;
      ui.skipWeapon.classList.toggle("selected", selection.buffIndexes.includes(0));
    }
    if (ui.secondBuffReward) {
      ui.secondBuffReward.hidden = buffIds.length < 2;
      const label = buffIds.length > 1 ? `增益B：${buffIds[1]}` : "增益B";
      ui.secondBuffReward.textContent = selection.buffIndexes.includes(1) ? `已选：${label}` : label;
      ui.secondBuffReward.disabled = !choice || buffIds.length < 2;
      ui.secondBuffReward.classList.toggle("selected", selection.buffIndexes.includes(1));
    }
    if (ui.confirmReward) {
      ui.confirmReward.hidden = !choice;
      ui.confirmReward.textContent = choice?.confirmLabel || "确认领取";
      ui.confirmReward.disabled = !choice || !hasSelection;
      ui.confirmReward.classList.toggle("primary-action", hasSelection);
    }
    if (ui.backToMap) {
      ui.backToMap.disabled = false;
      ui.backToMap.textContent = "确认离开";
    }
  }

  function resolveRewardChoice(action, buffIndex = null) {
    const choice = game.pendingWeaponChoice;
    if (!choice) return false;
    const buffIds = rewardChoiceBuffIds(choice);
    const selection = rewardSelection(choice);
    const grantWeapon = action === "selection"
      ? Boolean(selection.weapon && choice.weaponId)
      : action === "weapon" && Boolean(choice.weaponId);
    const selectedBuffIds = action === "selection"
      ? selectedRewardBuffIds(choice)
      : action === "buff" && Number.isInteger(buffIndex)
      ? [buffIds[buffIndex]].filter(Boolean)
      : [];
    const weaponName = choice.weaponId ? weaponChoiceName(choice.weaponId) : "";
    const selectedBuffNames = selectedBuffIds.join("、");
    game.pendingWeaponChoice = null;
    if (grantWeapon) {
      const added = addWeapon(game.player, choice.weaponId, true);
      if (added) rememberRewardFamily(choice.weaponId);
      const joinedName = displayWeaponName(game.lastWeaponReward?.weapon || weapons[choice.weaponId]);
      const weaponRewardOverridesText = game.lastWeaponReward?.type === "upgrade";
      if (selectedBuffIds.length) {
        grantRewardBuffs(selectedBuffIds);
      }
      const defaultText = selectedBuffIds.length
        ? `已领取：${joinedName}，${selectedBuffNames}。`
        : choice.acceptText || `已加入背包：${joinedName}。`;
      const suffix = selectedBuffIds.length && weaponRewardOverridesText
        ? ` 增益已获得：${selectedBuffNames}。`
        : choice.rewardSuffix || "";
      ui.clearText.textContent = `${weaponRewardText(defaultText)}${suffix}`;
    } else if (action === "buff" && selectedBuffIds.length) {
      game.lastWeaponReward = null;
      grantRewardBuffs(selectedBuffIds);
      const defaultBuffText = `已选择增益：${selectedBuffNames}。${weaponName ? `没有加入${weaponName}，本局仍保留圣剑榜资格。` : ""}`;
      ui.clearText.textContent = Number.isInteger(buffIndex)
        ? defaultBuffText
        : choice.buffText || choice.skipText || defaultBuffText;
    } else if (action === "selection" && selectedBuffIds.length) {
      game.lastWeaponReward = null;
      grantRewardBuffs(selectedBuffIds);
      ui.clearText.textContent = `已领取增益：${selectedBuffNames}。${weaponName ? `没有加入${weaponName}，本局仍保留圣剑榜资格。` : ""}`;
    } else {
      game.lastWeaponReward = null;
      ui.clearText.textContent = choice.declineText || `本次奖励没有领取。${weaponName ? `没有加入${weaponName}，本局仍保留圣剑榜资格。` : ""}`;
    }
    updateWeaponChoiceUi();
    updateHud();
    return true;
  }

  function resolveWeaponChoice(accept) {
    const choice = game.pendingWeaponChoice;
    if (!choice) return false;
    return resolveRewardChoice(accept ? "weapon" : rewardChoiceBuffIds(choice).length ? "buff" : "none", 0);
  }

  function isWeaponSealed(weapon) {
    const player = game.player;
    if (!player || (player.weaponSealTimer || 0) <= 0 || !weapon) return false;
    return weapon.id !== "sword" && weapon.kind !== "geometry";
  }

  function firstAvailableWeaponIndex(player = game.player) {
    if (!player) return -1;
    const geometryIndex = player.weapons.findIndex((weapon) => weapon.kind === "geometry" && !isWeaponSealed(weapon));
    if (geometryIndex >= 0) return geometryIndex;
    const swordIndex = player.weapons.findIndex((weapon) => weapon.id === "sword");
    if (swordIndex >= 0) return swordIndex;
    return player.weapons.findIndex((weapon) => !isWeaponSealed(weapon));
  }

  function sealPlayerNonGeometryWeapons(duration = weaponSealDuration, sourceId = "") {
    const player = game.player;
    if (!player) return;
    if (sourceId) {
      player.weaponSealSourceId = sourceId;
      player.weaponSealTimer = Math.max(player.weaponSealTimer || 0, 999);
    } else {
      player.weaponSealTimer = Math.max(player.weaponSealTimer || 0, duration);
    }
    if (isWeaponSealed(player.weapon)) {
      const fallback = firstAvailableWeaponIndex(player);
      if (fallback >= 0) {
        player.weaponIndex = fallback;
        player.weapon = player.weapons[fallback];
        player.attackTimer = 0;
      }
    }
    burst(player.x, player.y, colors.cyan, 14);
    updateHud();
  }

  function clearWeaponSealFromSource(sourceId) {
    const player = game.player;
    if (!player || !sourceId || player.weaponSealSourceId !== sourceId) return;
    player.weaponSealSourceId = "";
    player.weaponSealTimer = 0;
    updateHud();
  }

  function setWeaponIndex(index) {
    const player = game.player;
    if (!player || index < 0 || index >= player.weapons.length) return false;
    if (isWeaponSealed(player.weapons[index])) return false;
    player.weaponIndex = index;
    player.weapon = player.weapons[index];
    player.attackTimer = 0;
    updateHud();
    return true;
  }

  function cycleWeapon(direction = 1) {
    const player = game.player;
    if (!player || player.weapons.length < 2) return false;
    for (let step = 1; step <= player.weapons.length; step += 1) {
      const nextIndex = (player.weaponIndex + direction * step + player.weapons.length) % player.weapons.length;
      if (!isWeaponSealed(player.weapons[nextIndex])) return setWeaponIndex(nextIndex);
    }
    return false;
  }

  function startReload(weapon) {
    if (!weapon || weapon.infiniteAmmo || weapon.reloading || weapon.ammo >= weapon.magazine) {
      return false;
    }
    weapon.reloading = true;
    weapon.reloadTimer = weaponReloadTime(weapon);
    return true;
  }

  function geometryShieldValue(weapon) {
    if (!weapon) return 0;
    const bonus = clamp((weapon.level || 1) - 1, 0, weapon.shieldValueMaxBonus ?? 2);
    return Math.round((weapon.shieldValue || 10) + bonus * (weapon.shieldValuePerLevel || 5));
  }

  function armPassiveShieldTimer(player = game.player) {
    if (!player) return;
    const shieldWeapon = player.weapons.find((weapon) => weapon.special === "shieldPulse");
    player.shieldTimer = shieldWeapon ? shieldWeapon.shieldEvery || 8 : 0;
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
    const shieldWeapon = player.weapons.find((weapon) => weapon.special === "shieldPulse");
    if (!shieldWeapon) return;
    player.shieldTimer = Math.max(0, (player.shieldTimer || 0) - dt);
    if (player.shieldTimer > 0) return;
    const shieldValue = geometryShieldValue(shieldWeapon);
    player.shield = Math.max(player.shield || 0, shieldValue);
    player.shieldTimer = shieldWeapon.shieldEvery || 8;
  }

  function ammoLabel(weapon) {
    if (!weapon || weapon.infiniteAmmo) return "无限";
    if (weapon.reloading) return `换弹 ${weapon.reloadTimer.toFixed(1)}s`;
    return `${weapon.ammo}/${weapon.magazine}`;
  }

  function openVersionSelect() {
    mode = "version";
    showScreen("version");
  }

  function startVersion(channel = "alpha") {
    game.versionChannel = channel === "beta" ? "beta" : "alpha";
    resetGame();
  }

  function resetGame() {
    const versionChannel = game.versionChannel || "alpha";
    mode = "map";
    game.versionChannel = versionChannel;
    game.startedAt = performance.now();
    game.elapsed = 0;
    game.kills = 0;
    game.weaponsFound = 1;
    Object.keys(game.completed).forEach((key) => {
      if (!completedRoomKeys.includes(key)) delete game.completed[key];
    });
    completedRoomKeys.forEach((key) => {
      game.completed[key] = false;
    });
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
    game.monsterClearDelay = 0;
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
    game.developerMode = false;
    game.developerModeUsed = false;
    game.developerCustomMessage = "";
    game.credits = 0;
    resetBetaBossShop();
    hideLeaderboardNameForm();
    game.message = versionChannel === "beta" ? "当前状态：β 测试服走廊。" : "当前状态：刚进入复习走廊。";
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
    if (name === "menu") refreshFunFacts();
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
    game.monsterClearDelay = 0;
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

    const upgraded = completedRoomKeys.some((key) => game.completed[key]);
    ui.bossRoom.classList.toggle("completed", upgraded);
    ui.mapLog.textContent = isBetaVersion()
      ? `${game.message} | 学分：${game.credits || 0}`
      : game.message;
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
      safeCircles.push({ x: game.boss.x, y: game.boss.y, r: 128 * bossSizeScale });
      game.boss.cores.forEach((core) => {
        const pos = corePosition(core);
        safeCircles.push({ x: pos.x, y: pos.y, r: 64 * bossSizeScale });
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
    if (forcedShape === "brokenLine") return createBrokenLineObstacle(center);
    if (forcedShape === "corner") return createCornerObstacle(center);
    if (forcedShape === "blob") return createBlobObstacle(center);
    if (forcedShape === "rect") return createRectObstacle(center, roomType);
    const roll = Math.random();
    if (roll < 0.3) return createLineObstacle(center);
    if (roll < 0.55) return createCurveObstacle(center);
    if (roll < 0.75) return createBrokenLineObstacle(center);
    if (roll < 0.9) return createCornerObstacle(center);
    if (roll < 0.98) return createBlobObstacle(center);
    return createRectObstacle(center, roomType);
  }

  function createRectObstacle(center, roomType) {
    const horizontal = Math.random() > 0.35;
    const longSide = (48 + Math.random() * 32) * obstacleLengthScale;
    const shortSide = randomObstacleThickness(7.2, 9.8);
    const obstacle = {
      shape: "rect",
      x: center.x,
      y: center.y,
      w: horizontal ? longSide : shortSide,
      h: horizontal ? shortSide : longSide,
    };
    if (roomType === "boss") {
      obstacle.w *= horizontal ? 0.96 : 0.9;
      obstacle.h *= horizontal ? 0.9 : 0.96;
    }
    obstacle.x -= obstacle.w / 2;
    obstacle.y -= obstacle.h / 2;
    return obstacle;
  }

  function createLineObstacle(center) {
    const length = (50 + Math.random() * 36) * obstacleLengthScale;
    const angle = Math.random() * Math.PI * 2;
    const half = length / 2;
    const thickness = randomObstacleThickness(7.4, 10.2);
    const points = [
      { x: center.x - Math.cos(angle) * half, y: center.y - Math.sin(angle) * half },
      { x: center.x + Math.cos(angle) * half, y: center.y + Math.sin(angle) * half },
    ];
    return obstacleFromPoints("line", points, thickness);
  }

  function createCurveObstacle(center) {
    const length = (56 + Math.random() * 34) * obstacleLengthScale;
    const angle = Math.random() * Math.PI * 2;
    const bend = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 20) * obstacleThinnessScale;
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
    return obstacleFromPoints("curve", points, randomObstacleThickness(7, 9.8));
  }

  function createBrokenLineObstacle(center) {
    const length = (60 + Math.random() * 34) * obstacleLengthScale;
    const gap = 18 + Math.random() * 16;
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const px = -dy;
    const py = dx;
    const half = length / 2;
    const gapHalf = Math.min(gap / 2, length * 0.2);
    const offset = (Math.random() - 0.5) * 9;
    const segments = [
      [
        { x: center.x - dx * half, y: center.y - dy * half },
        { x: center.x - dx * gapHalf, y: center.y - dy * gapHalf },
      ],
      [
        { x: center.x + dx * gapHalf + px * offset, y: center.y + dy * gapHalf + py * offset },
        { x: center.x + dx * half + px * offset, y: center.y + dy * half + py * offset },
      ],
    ];
    return obstacleFromSegments("brokenLine", segments, randomObstacleThickness(7.2, 9.8));
  }

  function createCornerObstacle(center) {
    const arm = (34 + Math.random() * 24) * obstacleLengthScale;
    const angle = Math.random() * Math.PI * 2;
    const turn = (Math.random() > 0.5 ? 1 : -1) * (Math.PI * (0.38 + Math.random() * 0.18));
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const ex = Math.cos(angle + turn);
    const ey = Math.sin(angle + turn);
    const points = [
      { x: center.x - dx * arm, y: center.y - dy * arm },
      { x: center.x, y: center.y },
      { x: center.x + ex * arm, y: center.y + ey * arm },
    ];
    return obstacleFromPoints("corner", points, randomObstacleThickness(7, 9.6));
  }

  function createBlobObstacle(center) {
    const count = 5 + Math.floor(Math.random() * 3);
    const rx = 14 + Math.random() * 8;
    const ry = 11 + Math.random() * 7;
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

  function randomObstacleThickness(min, max) {
    return clamp((min + Math.random() * (max - min)) * obstacleThinnessScale, obstacleMinThickness, obstacleMaxThickness);
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

  function obstacleFromSegments(shape, segments, thickness = 8) {
    const points = segments.flat();
    const bounds = pointsBounds(points, thickness / 2);
    return {
      shape,
      segments,
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
    const count = roomType === "boss" ? 5 : 3 + Math.floor(Math.random() * 2);
    const obstacles = [];

    for (let i = 0; i < count; i += 1) {
      const forcedShape = i === 0 ? ["brokenLine", "corner"][Math.floor(Math.random() * 2)] : null;
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
    if (door.completed) {
      ui.mapPrompt.textContent = "已完成";
    } else if (isBetaVersion() && isBetaRandomRoomKey(door.key) && !game.randomRooms[door.key]) {
      ui.mapPrompt.textContent = (game.credits || 0) >= betaRandomRoomCost
        ? `按 E 消耗 ${betaRandomRoomCost} 学分进入 ${door.label}`
        : `需要 ${betaRandomRoomCost} 学分开启 ${door.label}`;
    } else if (isBetaVersion() && door.key === "boss") {
      ui.mapPrompt.textContent = "按 E 打开 Boss 前商店";
    } else {
      ui.mapPrompt.textContent = `按 E 进入 ${door.label}`;
    }
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
    game.monsterClearDelay = 0;
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
    game.monsterClearDelay = 0;
    game.roomReward = {
      weapon: room.rewardWeapon || room.enemy.rewardWeapon,
      clearEyebrow: room.title,
      clearTitle: room.clearTitle || `${room.enemy.name}被击败`,
      clearText: room.clearText || `你击败了${room.enemy.name}，获得了新的武器和增益。`,
    };
    restoreMissingHpOnRoomEnter(game.player);
    game.pendingChallenge = null;
    game.player.x = W * 0.5;
    game.player.y = H * 0.74;
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    armPassiveShieldTimer(game.player);
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
    const knowledgeRoomKinds = {
      monster: "calculus",
      geometry: "geometry",
      linear: "linear",
    };
    const lockedKind = room.allowMixedEnemies ? null : knowledgeRoomKinds[room.knowledgeKey || room.completedKey];
    const pool = randomMonsterPool.filter((enemy) => {
      if (enemy.id === primary.id) return false;
      return lockedKind ? enemy.kind === lockedKind : true;
    });

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
      mechanics: [...(enemyDef.mechanics || [])],
      color: enemyDef.color,
      x: position.x,
      y: position.y,
      baseX: position.x,
      baseY: position.y,
      r: enemyDef.radius * characterSizeScale,
      hp,
      maxHp: hp,
      fireTimer: 0.65 + index * 0.32,
      moveT: index * 1.15,
      moveAmp: enemyDef.moveAmp * (count === 1 ? 1 : count === 2 ? 0.88 : 0.74),
      moveSpeed: enemyDef.moveSpeed * (count === 3 ? 0.9 : 1),
      fireEvery: enemyDef.fireEvery * fireScale,
      facingAngle: Math.PI / 2,
      backHitFlash: 0,
      shieldFlash: 0,
      healFlash: 0,
      defeated: false,
    };
  }

  function customEnemyPosition(index, total) {
    const safeTotal = Math.max(1, total);
    const columns = Math.max(1, Math.ceil(Math.sqrt(safeTotal * 1.35)));
    const rows = Math.max(1, Math.ceil(safeTotal / columns));
    const col = index % columns;
    const row = Math.floor(index / columns);
    const spanX = arena.width - 190;
    const spanY = arena.height - 190;
    const x = columns <= 1
      ? W * 0.5
      : arena.left + 95 + (spanX * col) / Math.max(1, columns - 1);
    const y = rows <= 1
      ? H * 0.28
      : arena.top + 78 + (spanY * row) / Math.max(1, rows - 1);
    const jitter = total > 9 ? 14 : 8;
    return arenaPoint(
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
      42,
    );
  }

  function createDeveloperCustomEnemy(enemyDef, index, total) {
    const position = customEnemyPosition(index, total);
    const hp = Math.max(20, Math.round(Number(enemyDef.hp || baseStats.enemyHp || 60)));
    return {
      id: `${enemyDef.id || "enemy"}-custom-${index}-${Date.now().toString(36)}`,
      name: enemyDef.name,
      shortName: enemyDef.shortName,
      kind: enemyDef.kind,
      pattern: enemyDef.pattern,
      mechanics: [...(enemyDef.mechanics || [])],
      color: enemyDef.color,
      x: position.x,
      y: position.y,
      baseX: position.x,
      baseY: position.y,
      r: (enemyDef.radius || 24) * characterSizeScale,
      hp,
      maxHp: hp,
      fireTimer: 0.45 + (index % 6) * 0.18,
      moveT: index * 0.63,
      moveAmp: enemyDef.moveAmp || 64,
      moveSpeed: enemyDef.moveSpeed || 1.4,
      fireEvery: enemyDef.fireEvery || 1.2,
      facingAngle: Math.PI / 2,
      backHitFlash: 0,
      shieldFlash: 0,
      healFlash: 0,
      defeated: false,
    };
  }

  function startDeveloperCustomRoomFromPanel() {
    const defs = developerCustomEnemyDefs();
    const selections = defs.map((enemy) => {
      const input = ui.modalBody?.querySelector(`[data-custom-enemy-count="${CSS.escape(enemy.id)}"]`);
      return {
        enemy,
        count: clamp(Math.round(Number(input?.value || 0)), 0, 12),
      };
    }).filter((item) => item.count > 0);
    const total = selections.reduce((sum, item) => sum + item.count, 0);
    if (!total) {
      game.developerCustomMessage = "至少给一种怪物设置数量，才能进入自定义房间。";
      return false;
    }

    mode = "combat";
    game.developerMode = true;
    game.developerModeUsed = true;
    game.developerCustomMessage = `已进入自定义房间：共 ${total} 个测试目标。`;
    game.activeRoom = "monster";
    game.activeRoomKey = "__developerCustom";
    game.roomTitle = "自定义房间";
    game.roomReward = null;
    game.pendingChallenge = null;
    game.challengeCount = Math.min(3, total);
    game.defeatedInRoom = 0;
    game.monsterClearDelay = 0;
    game.player.x = W * 0.5;
    game.player.y = H * 0.74;
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    armPassiveShieldTimer(game.player);
    const expanded = [];
    selections.forEach(({ enemy, count }) => {
      for (let i = 0; i < count; i += 1) expanded.push(enemy);
    });
    game.enemies = expanded.map((enemy, index) => createDeveloperCustomEnemy(enemy, index, expanded.length));
    game.obstacles = generateRoomObstacles("monster");
    closeModal();
    showScreen("combat");
    updateHud();
    return true;
  }

  function startMonsterRoom(roomKey = "monster", overrideRoom = null) {
    return openChallengeSelect(roomKey, overrideRoom);
  }

  function openChestRoom(roomKey = "chest") {
    if (game.completed[roomKey]) return;
    game.completed[roomKey] = true;
    restoreMissingHpOnRoomEnter(game.player);
    const rewardWeapon = pickChestWeapon(game.player);
    const rewardBuff = pickChestBuff();

    if (rewardWeapon) {
      const weaponName = weaponChoiceName(rewardWeapon);
      showClear(
        "宝箱房",
        "宝箱打开了",
        `宝箱里出现了两个奖励：武器「${weaponName}」和增益「${rewardBuff}」。可以选择其中一个，也可以都不拿。`,
        {
          weaponId: rewardWeapon,
          altBuff: rewardBuff,
          buffIds: [rewardBuff],
          title: `奖励选择：${weaponName} / ${rewardBuff}`,
          acceptLabel: "选择武器",
          buffLabel: "选择增益",
          declineLabel: "都不拿",
          acceptText: `已选择武器并加入背包：${weaponName}。`,
          buffText: `已选择增益：${rewardBuff}。没有加入${weaponName}，本局仍保留圣剑榜资格。`,
          declineText: `你没有领取宝箱奖励。没有加入${weaponName}，本局仍保留圣剑榜资格。`,
        }
      );
      return;
    }

    showClear(
      "宝箱房",
      "宝箱打开了",
      `宝箱里出现了增益「${rewardBuff}」。可以选择领取，也可以不拿。`,
      {
        buffIds: [rewardBuff],
        title: `奖励选择：${rewardBuff}`,
        buffLabel: "领取增益",
        declineLabel: "都不拿",
        buffText: `已选择增益：${rewardBuff}。`,
        declineText: "你没有领取宝箱奖励。",
      }
    );
  }

  function startRandomRoom(roomKey) {
    if (game.completed[roomKey]) return;
    const revealed = game.randomRooms[roomKey];
    if (!revealed && !chargeBetaRandomRoom(roomKey)) return;
    if (revealed?.type === "monster") {
      startMonsterRoom(roomKey, revealed.room);
      return;
    }
    if (revealed?.type === "chest") {
      openChestRoom(roomKey);
      return;
    }
    const roll = Math.random();
    if (roll < randomRoomMonsterChance) {
      const sourceRoom = pickRandomMonsterRoomTemplate();
      const enemy = sourceRoom.enemy;
      const title = randomRoomTitle(roomKey);
      startMonsterRoom(roomKey, {
        completedKey: roomKey,
        knowledgeKey: sourceRoom.completedKey,
        allowMixedEnemies: true,
        title,
        label: `${title}：${enemy.name}`,
        rewardWeapon: sourceRoom.rewardWeapon || enemy.rewardWeapon,
        clearTitle: `${enemy.name}被击败`,
        clearText: `你在随机教室中完成了${sourceRoom.title || "知识点教室"}的同款测试。`,
        enemy,
      });
      if (game.pendingChallenge?.room) {
        game.randomRooms[roomKey] = { type: "monster", room: game.pendingChallenge.room };
      }
      return;
    }
    game.randomRooms[roomKey] = { type: "chest" };
    openChestRoom(roomKey);
  }

  function bossShieldForCore(coreId, direct) {
    return direct ? 72 : 60;
  }

  function bossInitialCoreHp(direct) {
    return Number(baseStats.bossCoreHp || 300);
  }

  function ensureObstacleId(obstacle, prefix = "obstacle") {
    if (!obstacle) return "";
    obstacle.id ||= `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return obstacle.id;
  }

  function chooseInitialBossDomain(boss) {
    const candidates = boss?.cores.filter((core) => core.hp > 0) || [];
    if (!candidates.length) return;
    const core = candidates[Math.floor(Math.random() * candidates.length)];
    boss.initialDomainCoreId = core.id;
    boss.angle = -core.offset;
    boss.rotateFrom = boss.angle;
    boss.rotateTo = boss.angle;
  }

  function ensureBossNeutralObstacles(targetCount = bossInitialObstacleCount) {
    const neutral = game.obstacles.filter((obstacle) => !obstacle.cauchyDomain && !obstacle.cauchyCoreWall);
    for (let i = neutral.length; i < targetCount; i += 1) {
      const obstacle = createRoomObstacle("boss", game.obstacles, null, i === 0 ? "brokenLine" : null);
      if (!obstacle) break;
      ensureObstacleId(obstacle, "boss-wall");
      obstacle.bossNeutral = true;
      game.obstacles.push(obstacle);
    }
  }

  function replaceBossNeutralObstacles(targetCount) {
    game.obstacles = game.obstacles.filter((obstacle) => obstacle.cauchyDomain || obstacle.cauchyCoreWall);
    for (let i = 0; i < targetCount; i += 1) {
      const forcedShape = i === 0 ? "brokenLine" : null;
      const obstacle = createRoomObstacle("boss", game.obstacles, null, forcedShape);
      if (!obstacle) continue;
      ensureObstacleId(obstacle, "boss-wall");
      obstacle.bossNeutral = true;
      game.obstacles.push(obstacle);
    }
  }

  function startBossRoom(options = {}) {
    const bossOptions = options && typeof options === "object" ? options : {};
    if (isBetaVersion() && !bossOptions.bypassShop) {
      return openBetaBossShop();
    }
    mode = "combat";
    game.activeRoom = "boss";
    game.pendingChallenge = null;
    game.challengeCount = 1;
    game.defeatedInRoom = 0;
    game.monsterClearDelay = 0;
    if (!bossOptions.skipRestore) restoreMissingHpOnRoomEnter(game.player);
    game.player.x = W * 0.5;
    game.player.y = H * 0.78;
    game.playerShots = [];
    game.enemyShots = [];
    game.enemyLasers = [];
    game.slashes = [];
    game.particles = [];
    armPassiveShieldTimer(game.player);
    game.enemies = [];
    game.obstacles = [];
    const direct = !completedRoomKeys.some((key) => game.completed[key]);
    awakenDirectBossSword(game.player, direct);
    const coreHp = bossInitialCoreHp(direct);
    game.boss = {
      name: "三位一体",
      x: W * 0.5,
      y: H * 0.31,
      moveBaseX: W * 0.5,
      moveBaseY: H * 0.31,
      moveT: 0,
      moveAmp: direct ? 82 : 68,
      moveSpeed: direct ? 0.72 : 0.56,
      moveCycle: direct ? 8.8 : 10.2,
      movePath: [
        { x: W * 0.5, y: H * 0.24 },
        { x: W * 0.36, y: H * 0.39 },
        { x: W * 0.64, y: H * 0.39 },
      ],
      angle: 0,
      rotateFrom: 0,
      rotateTo: 0,
      rotating: false,
      rotateElapsed: 0,
      rotateDuration: direct ? 0.58 : 0.72,
      rotateTimer: bossDomainCycleSeconds,
      rotateCooldown: bossDomainCycleSeconds,
      rotationSteps: 0,
      domainCoreId: "",
      domainName: "",
      domainElapsed: 0,
      domainIndex: 0,
      initialDomainCoreId: "",
      gaussZones: [],
      gaussZoneTimer: 0,
      gaussZoneBonus: 0,
      gaussNextZoneCount: 0,
      gaussDomainKillHealCount: 0,
      gaussFullPowerStealthTimer: gaussFullPowerStealthEvery,
      descartesQuadrant: "",
      descartesQuadrantChanges: 0,
      descartesQuadrantProjectionCount: 0,
      descartesFullPowerTimer: descartesFullPowerSpawnEvery,
      cauchyDomainObstacleIds: [],
      cauchyCandidateObstacleIds: [],
      cauchyHighlightTimer: cauchyHighlightEvery,
      cauchyBombs: [],
      cauchyFullPowerTimer: cauchyFullPowerCycle,
      laserCount: 0,
      shotPatternCounts: {},
      weaponDamage: {},
      weaponDamageNames: {},
      obstacleBoomCount: 0,
      fullPowerCoreId: "",
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
      phaseName: direct ? "裸考高压" : "领域轮转",
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
          color: colors.chalk,
          offset: 0,
          attack: "cauchySquares",
          fireEvery: direct ? 1.2 : 1.45,
          baseFireEvery: direct ? 1.2 : 1.45,
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
          color: colors.cyan,
          offset: (Math.PI * 2) / 3,
          attack: "descartesCross",
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
          color: colors.warning,
          offset: (Math.PI * 4) / 3,
          attack: "gaussZones",
          fireEvery: direct ? 1.45 : 1.75,
          baseFireEvery: direct ? 1.45 : 1.75,
          fireTimer: 1.45,
        },
      ],
    };
    chooseInitialBossDomain(game.boss);
    game.obstacles = [];
    ensureBossNeutralObstacles(bossInitialObstacleCount);
    showScreen("combat");
    updateHud();
    return true;
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
    if (entry.scoreVersion !== leaderboardScoreVersion) return null;
    const score = Number(entry.score);
    if (!Number.isFinite(score) || score <= 0) return null;
    const seconds = Math.max(1, Math.round(Number(entry.seconds || entry.time || 0)));
    const playedAt = entry.playedAt || new Date().toISOString();
    const completedRooms = Array.isArray(entry.completedRooms)
      ? entry.completedRooms.filter(Boolean).slice(0, 6)
      : [];
    const cleanList = (value, limit = 12) => Array.isArray(value)
      ? value.map((item) => String(item || "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim()).filter(Boolean).slice(0, limit)
      : [];
    const weaponsFound = Math.max(1, Math.round(Number(entry.weaponsFound || 1)));
    const swordOnly = typeof entry.swordOnly === "boolean"
      ? entry.swordOnly
      : weaponsFound <= 1 && completedRooms.length === 0;
    const weaponIds = cleanList(entry.weaponIds, 12);
    if (swordOnly && !weaponIds.length) weaponIds.push("sword");
    const routeType = ["direct", "prepared", "full"].includes(entry.routeType)
      ? entry.routeType
      : clearRouteType(completedRooms.length);
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
      completedRoomKeys: cleanList(entry.completedRoomKeys, 6),
      completedRoomTypes: cleanList(entry.completedRoomTypes, 6),
      routeType,
      weaponIds,
      weaponNames: cleanList(entry.weaponNames, 12),
      buffs: cleanList(entry.buffs, 16),
      finalWeaponId: cleanList([entry.finalWeaponId], 1)[0] || "",
      finalWeaponName: cleanList([entry.finalWeaponName], 1)[0] || "",
      bossTopDamageWeaponId: cleanList([entry.bossTopDamageWeaponId], 1)[0] || cleanList([entry.finalWeaponId], 1)[0] || "",
      bossTopDamageWeaponName: cleanList([entry.bossTopDamageWeaponName], 1)[0] || cleanList([entry.finalWeaponName], 1)[0] || "",
      bossTopDamageWeaponDamage: Math.max(0, Math.round(Number(entry.bossTopDamageWeaponDamage || 0) * 10) / 10),
      swordOnly,
      playedAt,
      scoreVersion: leaderboardScoreVersion,
      timeMode: "combat",
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

  function defaultFunStats() {
    return {
      version: leaderboardScoreVersion,
      totalRuns: 0,
      bossClears: 0,
      failedRuns: 0,
      directBossClears: 0,
      preparedClears: 0,
      fullPrepClears: 0,
      fastestSeconds: 0,
      longestSeconds: 0,
      totalSeconds: 0,
      totalRunSeconds: 0,
      swordOnlyClears: 0,
      bestScore: 0,
      bestRemainingHp: 0,
      bestRemainingHpMax: 0,
      worstRemainingHp: 0,
      worstRemainingHpMax: 0,
      firepowerOverloadClears: 0,
      mostRooms: 0,
      totalKills: 0,
      maxKills: 0,
      maxWeaponsFound: 0,
      totalRoomsCompleted: 0,
      totalWeaponsFound: 0,
      lastPlayedAt: "",
      routeCounts: { direct: 0, prepared: 0, full: 0 },
      weaponUseCounts: {},
      finalWeaponCounts: {},
      bossTopDamageWeaponCounts: {},
      buffUseCounts: {},
      roomClearCounts: {},
      deathRoomCounts: {},
      deathStageCounts: {},
      entryIds: [],
    };
  }

  function normalizeFunStats(value) {
    if (!value || typeof value !== "object") return defaultFunStats();
    const stats = defaultFunStats();
    const intValue = (key) => {
      const valueNumber = Math.round(Number(value[key] || 0));
      return Number.isFinite(valueNumber) ? Math.max(0, valueNumber) : 0;
    };
    const countMap = (key) => {
      if (!value[key] || typeof value[key] !== "object") return {};
      return Object.fromEntries(
        Object.entries(value[key])
          .map(([entryKey, entryValue]) => {
            const count = Math.max(0, Math.round(Number(entryValue || 0)));
            return [String(entryKey), Number.isFinite(count) ? count : 0];
          })
          .filter(([, count]) => count > 0)
      );
    };
    const totalRuns = intValue("totalRuns");
    stats.bossClears = intValue("bossClears");
    stats.failedRuns = intValue("failedRuns");
    stats.totalRuns = Math.max(totalRuns, stats.bossClears + stats.failedRuns);
    stats.directBossClears = intValue("directBossClears");
    stats.preparedClears = intValue("preparedClears");
    stats.fullPrepClears = intValue("fullPrepClears");
    stats.fastestSeconds = intValue("fastestSeconds");
    stats.longestSeconds = intValue("longestSeconds");
    stats.totalSeconds = intValue("totalSeconds");
    stats.totalRunSeconds = Math.max(intValue("totalRunSeconds"), stats.totalSeconds);
    stats.swordOnlyClears = intValue("swordOnlyClears");
    stats.bestScore = intValue("bestScore");
    stats.bestRemainingHp = intValue("bestRemainingHp");
    stats.bestRemainingHpMax = intValue("bestRemainingHpMax");
    stats.worstRemainingHp = intValue("worstRemainingHp");
    stats.worstRemainingHpMax = intValue("worstRemainingHpMax");
    stats.firepowerOverloadClears = intValue("firepowerOverloadClears");
    stats.mostRooms = intValue("mostRooms");
    stats.totalKills = intValue("totalKills");
    stats.maxKills = intValue("maxKills");
    stats.maxWeaponsFound = intValue("maxWeaponsFound");
    stats.totalRoomsCompleted = intValue("totalRoomsCompleted");
    stats.totalWeaponsFound = intValue("totalWeaponsFound");
    stats.lastPlayedAt = typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : "";
    stats.routeCounts = {
      direct: stats.directBossClears,
      prepared: stats.preparedClears,
      full: stats.fullPrepClears,
      ...countMap("routeCounts"),
    };
    stats.weaponUseCounts = countMap("weaponUseCounts");
    stats.finalWeaponCounts = countMap("finalWeaponCounts");
    stats.bossTopDamageWeaponCounts = countMap("bossTopDamageWeaponCounts");
    if (!Object.keys(stats.bossTopDamageWeaponCounts).length) {
      stats.bossTopDamageWeaponCounts = { ...stats.finalWeaponCounts };
    }
    stats.buffUseCounts = countMap("buffUseCounts");
    stats.roomClearCounts = countMap("roomClearCounts");
    stats.deathRoomCounts = countMap("deathRoomCounts");
    stats.deathStageCounts = countMap("deathStageCounts");
    stats.entryIds = Array.isArray(value.entryIds) ? value.entryIds.map(String).slice(-1000) : [];
    return stats;
  }

  function readFunStats() {
    return normalizeFunStats(sharedFunStats);
  }

  function writeFunStats(stats) {
    const normalized = normalizeFunStats(stats);
    sharedFunStats = normalized;
    return normalized;
  }

  function updateFunFacts(stats = readFunStats()) {
    const normalized = normalizeFunStats(stats);
    if (!ui.modal.hidden && ui.modal.dataset.kind === "funFacts") {
      ui.modalBody.innerHTML = funFactsMarkup(normalized);
    }
    return normalized;
  }

  async function loadServerStats() {
    if (!window.fetch) return readFunStats();
    try {
      const response = await fetch("/api/stats", { cache: "no-store" });
      if (!response.ok) return readFunStats();
      const data = await response.json();
      if (data?.stats) return writeFunStats(data.stats);
    } catch {
      return readFunStats();
    }
    return readFunStats();
  }

  function refreshFunFacts(force = false) {
    const localStats = updateFunFacts();
    if (!window.fetch) return localStats;
    const now = Date.now();
    if (force || now - lastFunStatsFetch > 4000) {
      lastFunStatsFetch = now;
      loadServerStats().then(updateFunFacts);
    }
    return localStats;
  }

  function recordFunStats(entry) {
    if (!entry || typeof entry !== "object") return readFunStats();
    syncStatsToServer(entry);
    return readFunStats();
  }

  function syncStatsToServer(entry) {
    if (!window.fetch) return;
    fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.stats) updateFunFacts(writeFunStats(data.stats));
      })
      .catch(() => {
        // Shared fun facts are server-owned; failed uploads are retried by normal leaderboard sync later.
      });
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
    return completedRoomKeys
      .filter((key) => game.completed[key] && names[key])
      .map((key) => names[key]);
  }

  function completedRoomKeyNames() {
    return completedRoomKeys.filter((key) => game.completed[key]);
  }

  function completedRoomTypeNames() {
    return completedRoomKeyNames().map((key) => completedRoomType(key));
  }

  function clearRouteType(roomCount) {
    if (roomCount <= 0) return "direct";
    if (roomCount >= completedRoomKeys.length) return "full";
    return "prepared";
  }

  function completedRoomType(key) {
    if (["monster", "geometry", "linear"].includes(key)) return "combat";
    const revealedType = game.randomRooms[key]?.type;
    if (revealedType === "monster") return "combat";
    return "treasure";
  }

  function completedRoomBreakdown() {
    const counts = {
      total: 0,
      combat: 0,
      treasure: 0,
    };
    completedRoomKeys.forEach((key) => {
      if (!game.completed[key]) return;
      counts.total += 1;
      const type = completedRoomType(key);
      counts[type] += 1;
    });
    return counts;
  }

  function completedRoomScore() {
    const breakdown = completedRoomBreakdown();
    const combatScore = breakdown.combat * 105;
    const treasureScore = breakdown.treasure * 28;
    return {
      ...breakdown,
      combatScore,
      treasureScore,
      score: combatScore + treasureScore,
    };
  }

  function isSwordOnlyRun() {
    return !game.usedNonSwordWeapon && game.weaponsFound <= 1;
  }

  function calculateSpeedScore(seconds) {
    const safeSeconds = Math.max(1, Number(seconds) || 1);
    const baseScore = Math.max(0, 2200 - safeSeconds * 5.8);
    const earlyWindow = clamp((120 - safeSeconds) / 120, 0, 1);
    const earlyBonus = 1000 * Math.pow(earlyWindow, 1.5);
    return Math.max(0, Math.round(baseScore + earlyBonus));
  }

  function calculateClearScore(seconds, player) {
    const roomScoreDetails = completedRoomScore();
    const roomCount = roomScoreDetails.total;
    const hpRatio = clamp((player?.hp || 0) / Math.max(1, player?.maxHp || 1), 0, 1);
    const swordOnly = isSwordOnlyRun();
    const bossClear = 650;
    const roomScore = roomScoreDetails.score;
    const killScore = Math.min(game.kills, 18) * 26;
    const weaponScore = Math.max(0, game.weaponsFound - 1) * 16;
    const hpScore = Math.round(hpRatio * 300);
    const speedScore = calculateSpeedScore(seconds);
    const overtimePenalty = Math.max(0, Math.round((seconds - 300) * 5.5));
    const swordRouteBonus = swordOnly ? 520 : 0;
    const swordSpeedBonus = swordOnly ? Math.max(0, Math.round(560 - seconds * 1.4)) : 0;
    const swordDirectBonus = swordOnly && roomCount === 0 ? 240 : 0;
    const swordBonus = swordRouteBonus + swordSpeedBonus + swordDirectBonus;
    const score = Math.max(1, Math.round(
      bossClear + roomScore + killScore + weaponScore + hpScore + speedScore + swordBonus - overtimePenalty
    ));
    return {
      score,
      roomCount,
      combatRoomCount: roomScoreDetails.combat,
      treasureRoomCount: roomScoreDetails.treasure,
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

  function roomLabelForStats(key) {
    const labels = {
      monster: "微积分",
      chest: "随机 A",
      geometry: "欧氏几何",
      linear: "线性代数",
      randomB: "随机 B",
      randomC: "随机 C",
      boss: "Boss 房",
      unknown: "未知位置",
    };
    return labels[key] || game.roomTitle || key || "未知位置";
  }

  function currentFailureRoomKey() {
    if (game.activeRoom === "boss") return "boss";
    if (game.activeRoom === "monster") return game.activeRoomKey || "monster";
    return game.activeRoomKey || "unknown";
  }

  function currentFailureStage() {
    if (game.activeRoom === "boss" && game.boss) {
      const defeated = Math.max(0, game.boss.defeatedCount || 0);
      if (defeated >= 2) return "Boss：末核狂暴";
      if (defeated === 1) return "Boss：压力上升";
      return "Boss：三核展开";
    }
    if (game.activeRoom === "monster") {
      return `普通房：${Math.max(1, game.challengeCount || 1)} 人挑战`;
    }
    return "探索中断";
  }

  function makeRunStatsEntry(win, score, seconds, scoreDetails = null) {
    const player = game.player || createPlayer();
    const completedRooms = completedRoomNames();
    const weaponIds = player.weapons.map((weapon) => weapon.id);
    const deathRoomKey = win ? "" : currentFailureRoomKey();
    const bossTopDamageWeapon = win ? topBossDamageWeapon() : { id: "", name: "", damage: 0 };
    return {
      id: `${Date.now()}-${Math.round(score)}`,
      result: win ? "win" : "loss",
      name: defaultLeaderboardName,
      score: Math.max(0, Math.round(score)),
      seconds,
      kills: game.kills,
      weaponsFound: game.weaponsFound,
      hp: Math.max(0, Math.ceil(player.hp)),
      maxHp: player.maxHp,
      completedRooms,
      completedRoomKeys: completedRoomKeyNames(),
      completedRoomTypes: completedRoomTypeNames(),
      routeType: clearRouteType(completedRooms.length),
      weaponIds,
      weaponNames: player.weapons.map((weapon) => displayWeaponName(weapon)),
      buffs: [...(player.buffs || [])],
      finalWeaponId: player.weapon?.id || weaponIds[weaponIds.length - 1] || "",
      finalWeaponName: player.weapon ? displayWeaponName(player.weapon) : "",
      bossTopDamageWeaponId: bossTopDamageWeapon.id || player.weapon?.id || weaponIds[weaponIds.length - 1] || "",
      bossTopDamageWeaponName: bossTopDamageWeapon.name || (player.weapon ? displayWeaponName(player.weapon) : ""),
      bossTopDamageWeaponDamage: bossTopDamageWeapon.damage || 0,
      swordOnly: scoreDetails?.swordOnly ?? isSwordOnlyRun(),
      deathRoomKey,
      deathRoomName: deathRoomKey ? roomLabelForStats(deathRoomKey) : "",
      deathStage: win ? "" : currentFailureStage(),
      playedAt: new Date().toISOString(),
      scoreVersion: leaderboardScoreVersion,
      timeMode: "combat",
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

  function resultStatMarkup(rows) {
    return rows
      .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
      .join("");
  }

  function swordClearStyle(scoreDetails, seconds) {
    if (!scoreDetails) return "圣剑通关";
    if (scoreDetails.roomCount === 0) return seconds <= 90 ? "直入终局" : "孤身赴考";
    if (scoreDetails.roomCount >= 6) return "六房独行";
    return "单刃破题";
  }

  function swordOnlyResultMarkup(scoreDetails, score, seconds, player) {
    const hp = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
    const route = scoreDetails.roomCount === 0 ? "直通 Boss" : `${scoreDetails.roomCount} / 6`;
    const speedText = `+${scoreDetails.speedScore}${scoreDetails.overtimePenalty ? ` / 超时 -${scoreDetails.overtimePenalty}` : ""}`;
    return `
      <div class="sword-ending-card">
        <div class="sword-mark" aria-hidden="true">∫</div>
        <div>
          <span>圣剑榜资格确认</span>
          <strong>${swordClearStyle(scoreDetails, seconds)}</strong>
          <p>你没有让第二件武器进入背包，也没有借用其他兵器完成最后一击。三核心被同一柄圣剑拆解，期末考场留下了一条很干净的通关记录。</p>
        </div>
      </div>
      <div class="sword-result-stats">
        ${resultStatMarkup([
          ["完成路线", route],
          ["击败小怪", `${game.kills}`],
          ["剩余生命", hp],
          ["战斗用时", `${seconds} 秒`],
          ["速度修正", speedText],
          ["圣剑奖励", `+${scoreDetails.swordBonus}`],
          ["圣剑榜", "已收录"],
          ["最终评分", `${score}`],
        ])}
      </div>
      <p class="sword-ending-line">一柄剑，一张卷子，三枚核心。你把所有变量都留给了操作本身。</p>
    `;
  }

  function finishGame(win, options = {}) {
    mode = "result";
    const player = game.player;
    const seconds = Math.max(1, Math.round(Number(options.seconds ?? game.elapsed / 1000)));
    const scoreDetails = win ? calculateClearScore(seconds, player) : null;
    const score = win
      ? scoreDetails.score
      : Math.max(0, game.kills * 80 + Math.max(0, game.weaponsFound - 1) * 25 - seconds * 2);
    const speedText = scoreDetails
      ? `+${scoreDetails.speedScore}${scoreDetails.overtimePenalty ? ` / 超时 -${scoreDetails.overtimePenalty}` : ""}`
      : "-";
    const swordOnlyWin = Boolean(win && scoreDetails?.swordOnly);
    screens.result.classList.toggle("sword-ending", swordOnlyWin);
    ui.resultStats.className = swordOnlyWin ? "result-stats sword-result-wrap" : "result-stats";
    ui.resultTitle.hidden = swordOnlyWin;
    ui.resultEyebrow.textContent = swordOnlyWin ? "圣剑独行" : win ? "绩点保住了" : "期末结算";
    ui.resultTitle.textContent = swordOnlyWin ? "一柄圣剑，斩过三位一体" : win ? "恭喜通过期末考试！" : "很遗憾，你挂科了。";
    ui.resultStats.innerHTML = swordOnlyWin
      ? swordOnlyResultMarkup(scoreDetails, score, seconds, player)
      : resultStatMarkup([
        ["击败小怪", `${game.kills}`],
        ["完成房间", `${scoreDetails?.roomCount ?? completedRoomNames().length} / 6`],
        ["剩余生命", `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`],
        ["战斗用时", `${seconds} 秒`],
        ["速度修正", speedText],
        ["圣剑通关", scoreDetails?.swordOnly ? "是" : "否"],
        ["圣剑奖励", scoreDetails?.swordOnly ? `+${scoreDetails.swordBonus}` : "-"],
        ["最终评分", `${score}`],
    ]);
    hideLeaderboardNameForm();
    const statsEntry = makeRunStatsEntry(Boolean(win), score, seconds, scoreDetails);
    const canSaveRunStats = !game.developerModeUsed;
    if (win && options.saveLeaderboard !== false && canSaveRunStats) {
      recordFunStats(statsEntry);
      const updated = saveLeaderboardEntry(statsEntry);
      const ranks = leaderboardRanksForEntry(statsEntry, updated);
      if (ranks.length) showLeaderboardNameForm(statsEntry, ranks);
    } else if (!win && options.saveStats !== false && canSaveRunStats) {
      recordFunStats(statsEntry);
    }
    showScreen("result");
  }

  function shouldCountBattleTime() {
    if (mode !== "combat" || !ui.modal.hidden || isBossIntroActive()) return false;
    if (game.activeRoom === "monster") {
      return game.enemies.some((enemy) => !enemy.defeated);
    }
    if (game.activeRoom === "boss") {
      return Boolean(game.boss?.cores.some((core) => core.hp > 0));
    }
    return false;
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

    const bossIntroActive = isBossIntroActive();
    if (shouldCountBattleTime()) {
      game.elapsed += dt * 1000;
    }
    const player = game.player;
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    if (player.weaponSealSourceId) {
      if (!enemyById(player.weaponSealSourceId)) {
        clearWeaponSealFromSource(player.weaponSealSourceId);
      }
    } else {
      player.weaponSealTimer = Math.max(0, (player.weaponSealTimer || 0) - dt);
    }
    player.enemySlowTimer = Math.max(0, (player.enemySlowTimer || 0) - dt);
    if (player.enemySlowTimer <= 0) {
      player.enemySlowMultiplier = 1;
    }
    updatePlayerDotEffects(player, dt);
    player.dashCooldown = Math.max(0, (player.dashCooldown || 0) - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.mistakeBoostTimer = Math.max(0, (player.mistakeBoostTimer || 0) - dt);
    updateWeaponReloads(dt);
    updatePassiveShield(dt);

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

  function updatePlayerDotEffects(player, dt) {
    if (!player || (player.cauchyDotTimer || 0) <= 0) return;
    player.cauchyDotTimer = Math.max(0, player.cauchyDotTimer - dt);
    player.cauchyDotTick = (player.cauchyDotTick || 0) - dt;
    if (player.cauchyDotTick <= 0) {
      player.cauchyDotTick = 0.5;
      applyPlayerDamage(scaledIncomingDamage(cauchyDotDps * 0.5), colors.warning);
    }
  }

  function movementSpeedMultiplier(player) {
    let multiplier = hasBuff(player, "熬夜咖啡") ? 1.5 : 1;
    if ((player.enemySlowTimer || 0) > 0) {
      multiplier *= player.enemySlowMultiplier || enemySlowMultiplier;
    }
    multiplier *= bossDomainMoveMultiplier();
    if (
      game.activeRoom === "monster" &&
      game.enemies.some((enemy) => !enemy.defeated && hasEnemyMechanic(enemy, "gaussHalfField") && enemy.y >= monsterMidY())
    ) {
      multiplier *= 0.82;
    }
    return multiplier;
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
    if (isWeaponSealed(weapon)) {
      const fallback = firstAvailableWeaponIndex(player);
      if (fallback >= 0) setWeaponIndex(fallback);
      return;
    }
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
    player.attackTimer = weapon.cooldown * playerAttackCooldownMultiplier(player);
    const attackKind = weapon.kind;
    const damageMultiplier = weaponDamageScale(weapon) * playerDamageBuffMultiplier(player);
    const sourceWeaponId = weapon.id;
    const sourceWeaponName = displayWeaponName(weapon);

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
            weaponId: sourceWeaponId,
            weaponName: sourceWeaponName,
            hitIds: new Set(),
            originX: player.x,
            originY: player.y,
          });
        });
        return;
      }
      if (weapon.special === "shieldPulse") {
        const shieldValue = geometryShieldValue(weapon);
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
          weaponId: sourceWeaponId,
          weaponName: sourceWeaponName,
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
        weaponId: sourceWeaponId,
        weaponName: sourceWeaponName,
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
        weaponId: sourceWeaponId,
        weaponName: sourceWeaponName,
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

  function hasEnemyMechanic(enemy, name) {
    return Boolean(enemy?.mechanics?.includes(name));
  }

  function enemyHpRatio(enemy) {
    return clamp((enemy?.hp || 0) / Math.max(1, enemy?.maxHp || 1), 0, 1);
  }

  function monsterMidX() {
    return (arena.left + arena.right) / 2;
  }

  function monsterMidY() {
    return (arena.top + arena.bottom) / 2;
  }

  function enemyDamageMultiplier(enemy) {
    let multiplier = 1;
    if (hasEnemyMechanic(enemy, "gaussHalfField") && enemyInTopHalf(enemy)) {
      multiplier *= 2;
    }
    return multiplier;
  }

  function enemyReceivedDamageMultiplier(enemy) {
    let multiplier = 1;
    if (hasEnemyMechanic(enemy, "jordanDomain") && (enemy.jordanTransitionTimer || 0) > 0) {
      return 0;
    }
    if (hasEnemyMechanic(enemy, "lhopitalBlade") && (!enemy.lhopitalInitialized || (enemy.lhopitalInvincibleTimer || 0) > 0)) {
      return 0;
    }
    if (hasEnemyMechanic(enemy, "lhopitalBlade") && (enemy.lhopitalRestTimer || 0) > 0) {
      multiplier *= 0.25;
    }
    if (hasEnemyMechanic(enemy, "taylorTripleDash") && (enemy.taylorRestTimer || 0) > 0) {
      multiplier *= 0.2;
    }
    if (hasEnemyMechanic(enemy, "gaussHalfField") && enemyInTopHalf(enemy)) {
      multiplier *= 0.5;
    }
    return multiplier;
  }

  function enemyById(id) {
    if (!id) return null;
    return game.enemies.find((enemy) => enemy.id === id && !enemy.defeated) || null;
  }

  function fireEnemyShot(enemy, x, y, angle, speed, damage, color, options = {}) {
    spawnEnemyShot(
      x,
      y,
      angle,
      speed,
      damage * enemyDamageMultiplier(enemy),
      color,
      {
        ...options,
        ownerId: enemy.id,
      }
    );
  }

  function enemyInTopHalf(enemy) {
    return (enemy?.y ?? enemy?.baseY ?? 0) < monsterMidY();
  }

  function arenaPoint(x, y, padding = 40) {
    return {
      x: clamp(x, arena.left + padding, arena.right - padding),
      y: clamp(y, arena.top + padding, arena.bottom - padding),
    };
  }

  function randomArenaPoint(padding = 46) {
    return {
      x: arena.left + padding + Math.random() * Math.max(1, arena.width - padding * 2),
      y: arena.top + padding + Math.random() * Math.max(1, arena.height - padding * 2),
    };
  }

  function applyEnemySlow(multiplier = enemySlowMultiplier, duration = enemySlowDuration) {
    const player = game.player;
    if (!player) return;
    player.enemySlowTimer = Math.max(player.enemySlowTimer || 0, duration);
    player.enemySlowMultiplier = Math.min(player.enemySlowMultiplier || 1, multiplier);
  }

  function rayEndPoint(x, y, angle) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const candidates = [];
    if (Math.abs(dx) > 0.0001) {
      candidates.push((arena.left - x) / dx);
      candidates.push((arena.right - x) / dx);
    }
    if (Math.abs(dy) > 0.0001) {
      candidates.push((arena.top - y) / dy);
      candidates.push((arena.bottom - y) / dy);
    }
    const t = candidates.filter((value) => value > 0).sort((a, b) => a - b)[0] || 0;
    return {
      x: clamp(x + dx * t, arena.left, arena.right),
      y: clamp(y + dy * t, arena.top, arena.bottom),
    };
  }

  function laserSegment(laser) {
    if (laser.orientation === "ray") {
      const startX = laser.sourceX ?? laser.x ?? 0;
      const startY = laser.sourceY ?? laser.y ?? 0;
      const end = rayEndPoint(startX, startY, laser.angle || 0);
      return { ax: startX, ay: startY, bx: end.x, by: end.y };
    }
    if (laser.orientation === "vertical") {
      return { ax: laser.x, ay: arena.top, bx: laser.x, by: arena.bottom };
    }
    return { ax: arena.left, ay: laser.y, bx: arena.right, by: laser.y };
  }

  function laserHitsPlayer(laser, player) {
    if (laser.orientation === "ray") {
      const segment = laserSegment(laser);
      return distancePointToSegment(player.x, player.y, segment.ax, segment.ay, segment.bx, segment.by) <= player.r + laser.width / 2;
    }
    const halfWidth = laser.width / 2;
    return laser.orientation === "vertical"
      ? Math.abs(player.x - laser.x) <= player.r + halfWidth
      : Math.abs(player.y - laser.y) <= player.r + halfWidth;
  }

  function beginLhopitalSlash(enemy) {
    const player = game.player || enemy;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const target = arenaPoint(
      enemy.x + Math.cos(angle) * 86,
      enemy.y + Math.sin(angle) * 86,
      38
    );
    enemy.lhopitalSlashAngle = angle;
    enemy.lhopitalSlashFromX = enemy.x;
    enemy.lhopitalSlashFromY = enemy.y;
    enemy.lhopitalSlashTargetX = target.x;
    enemy.lhopitalSlashTargetY = target.y;
    enemy.lhopitalSlashWarnTimer = 0.18;
    enemy.lhopitalSlashWarnMax = 0.18;
    enemy.lhopitalSlashHitPlayer = false;
  }

  function startLhopitalSlash(enemy) {
    enemy.lhopitalSlashFromX = enemy.x;
    enemy.lhopitalSlashFromY = enemy.y;
    enemy.lhopitalSlashActiveTimer = 0.24;
    enemy.lhopitalSlashActiveMax = 0.24;
    enemy.lhopitalTrailTimer = 0;
  }

  function finishLhopitalSlash(enemy) {
    enemy.baseX = enemy.x;
    enemy.baseY = enemy.y;
    enemy.moveT = 0;
    enemy.lhopitalSlashRemaining = Math.max(0, (enemy.lhopitalSlashRemaining || 1) - 1);
    if (enemy.lhopitalSlashRemaining > 0) {
      enemy.lhopitalSlashDelay = 0.24;
      return;
    }
    enemy.lhopitalRestTimer = enemyHpRatio(enemy) <= 0.2 ? lhopitalEnragedRestDuration : lhopitalRestDuration;
    enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, enemy.lhopitalRestTimer);
  }

  function updateLhopitalBlade(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "lhopitalBlade")) return;
    if (!enemy.lhopitalInitialized) {
      enemy.lhopitalInitialized = true;
      enemy.lhopitalInvincibleTimer = lhopitalInvincibleDuration;
      enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, lhopitalInvincibleDuration);
    }
    enemy.lhopitalInvincibleTimer = Math.max(0, (enemy.lhopitalInvincibleTimer || 0) - dt);
    if (enemy.lhopitalInvincibleTimer > 0) {
      enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, 0.25);
      return;
    }
    enemy.lhopitalRestTimer = Math.max(0, (enemy.lhopitalRestTimer || 0) - dt);
    if (enemy.lhopitalRestTimer > 0) {
      enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, 0.25);
      return;
    }
    if ((enemy.lhopitalSlashActiveTimer || 0) > 0) return;
    if ((enemy.lhopitalSlashWarnTimer || 0) > 0) {
      enemy.lhopitalSlashWarnTimer = Math.max(0, enemy.lhopitalSlashWarnTimer - dt);
      if (enemy.lhopitalSlashWarnTimer <= 0) startLhopitalSlash(enemy);
      return;
    }
    enemy.lhopitalSlashDelay = Math.max(0, (enemy.lhopitalSlashDelay || 0) - dt);
    if (enemy.lhopitalSlashDelay > 0) return;
    if ((enemy.lhopitalSlashRemaining || 0) <= 0) {
      enemy.lhopitalSlashRemaining = enemyHpRatio(enemy) <= 0.2 ? 4 : 3;
    }
    beginLhopitalSlash(enemy);
  }

  function createTaylorDashPoints(enemy) {
    const points = [];
    let previous = { x: enemy.x, y: enemy.y };
    for (let i = 0; i < 3; i += 1) {
      let best = randomArenaPoint(50);
      let bestScore = -Infinity;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = randomArenaPoint(50);
        const score = distance(previous, candidate) + distance(game.player || enemy, candidate) * 0.28;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      points.push(best);
      previous = best;
    }
    return points;
  }

  function beginTaylorDashStep(enemy) {
    const target = enemy.taylorDashPoints?.shift();
    if (!target) return false;
    enemy.taylorDashTargetX = target.x;
    enemy.taylorDashTargetY = target.y;
    enemy.taylorDashWarnTimer = 0.26;
    enemy.taylorDashWarnMax = 0.26;
    return true;
  }

  function startTaylorDash(enemy) {
    const dx = (enemy.taylorDashTargetX || enemy.x) - enemy.x;
    const dy = (enemy.taylorDashTargetY || enemy.y) - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.taylorDashFromX = enemy.x;
    enemy.taylorDashFromY = enemy.y;
    enemy.taylorDashActiveTimer = clamp(dist / 820, 0.16, 0.42);
    enemy.taylorDashActiveMax = enemy.taylorDashActiveTimer;
    enemy.taylorDashHitPlayer = false;
    enemy.taylorTrailTimer = 0;
  }

  function finishTaylorDashStep(enemy) {
    enemy.baseX = enemy.x;
    enemy.baseY = enemy.y;
    enemy.moveT = 0;
    if (enemy.taylorDashPoints?.length) {
      beginTaylorDashStep(enemy);
    } else {
      enemy.taylorRestTimer = taylorRestDuration;
      enemy.taylorDashTimer = 3.0 + Math.random() * 0.8;
    }
  }

  function scheduleArchimedesDash(enemy, target, fromWall = false, warningTime = archimedesDashWarning) {
    if (!enemy || !target) return;
    const point = arenaPoint(target.x, target.y, 42);
    enemy.archimedesDashTargetX = point.x;
    enemy.archimedesDashTargetY = point.y;
    enemy.archimedesDashWarnTimer = warningTime;
    enemy.archimedesDashWarnMax = warningTime;
    enemy.archimedesDashHitPlayer = false;
    enemy.archimedesDashFromWall = Boolean(fromWall);
    enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, 0.28);
  }

  function startArchimedesDash(enemy) {
    const dx = (enemy.archimedesDashTargetX || enemy.x) - enemy.x;
    const dy = (enemy.archimedesDashTargetY || enemy.y) - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.archimedesDashFromX = enemy.x;
    enemy.archimedesDashFromY = enemy.y;
    enemy.archimedesDashActiveTimer = clamp(dist / 650, 0.24, 0.56);
    enemy.archimedesDashActiveMax = enemy.archimedesDashActiveTimer;
    enemy.archimedesTrailTimer = 0;
  }

  function finishArchimedesDash(enemy) {
    enemy.baseX = enemy.x;
    enemy.baseY = enemy.y;
    enemy.moveT = 0;
    if (enemy.archimedesDashFromWall) {
      enemy.archimedesWallDashCount = (enemy.archimedesWallDashCount || 0) + 1;
    } else {
      enemy.archimedesWallDashCount = 0;
    }
  }

  function updateArchimedesMarkDash(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "archimedesMarkDash")) return;
    if ((enemy.archimedesDashActiveTimer || 0) > 0) return;
    if ((enemy.archimedesDashWarnTimer || 0) > 0) {
      enemy.archimedesDashWarnTimer = Math.max(0, enemy.archimedesDashWarnTimer - dt);
      if (enemy.archimedesDashWarnTimer <= 0) startArchimedesDash(enemy);
    }
  }

  function markArchimedesDashTarget(shot, obstacle) {
    if (!shot?.archimedesMark) return false;
    const enemy = enemyById(shot.ownerId);
    if (!enemy || enemy.defeated || !hasEnemyMechanic(enemy, "archimedesMarkDash")) return false;
    const center = obstacleCenter(obstacle);
    obstacle.marked = true;
    obstacle.markTimer = archimedesDashWarning;
    obstacle.maxMarkTimer = archimedesDashWarning;
    scheduleArchimedesDash(enemy, center, true);
    burst(center.x, center.y, enemy.color || colors.cyan, 12);
    return true;
  }

  function scheduleJacobiVolley(enemy, damageMultiplier = 1) {
    enemy.jacobiVolleyWaves = 4;
    enemy.jacobiVolleyTimer = 0;
    enemy.jacobiVolleyBoost = damageMultiplier;
  }

  function fireJacobiWave(enemy) {
    if (!game.player) return;
    const baseAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
    const boost = enemy.jacobiVolleyBoost || 1;
    for (let i = -2; i <= 2; i += 1) {
      fireEnemyShot(enemy, enemy.x, enemy.y, baseAngle + i * 0.13, 158 + Math.abs(i) * 13, 8.5 * boost, enemy.color, {
        r: 5,
        life: 4.2,
      });
    }
  }

  function jacobiBlinkTarget(enemy) {
    const player = game.player;
    if (!player) return arenaPoint(enemy.x, enemy.y);
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const behind = {
      x: player.x - Math.cos(angle) * 92,
      y: player.y - Math.sin(angle) * 92,
    };
    const behindInside =
      behind.x >= arena.left + 42 &&
      behind.x <= arena.right - 42 &&
      behind.y >= arena.top + 42 &&
      behind.y <= arena.bottom - 42;
    if (behindInside) return behind;
    return arenaPoint(player.x + Math.cos(angle) * 92, player.y + Math.sin(angle) * 92, 42);
  }

  function fireJordanRing(enemy, empowered = false) {
    const count = empowered ? 18 : 14;
    const speed = empowered ? 112 : 98;
    const damage = empowered ? 7.5 : 6.5;
    const start = enemy.moveT * 0.35 + Math.random() * 0.25;
    for (let i = 0; i < count; i += 1) {
      const angle = start + (Math.PI * 2 * i) / count;
      fireEnemyShot(enemy, enemy.x, enemy.y, angle, speed, damage, enemy.color, {
        r: 4.5,
        life: 4.5,
        wallSplit: true,
        wallSplitDepth: 1,
      });
    }
  }

  function fireJordanHalfSlash(enemy) {
    if ((enemy.jordanSlashWarnTimer || 0) > 0 || (enemy.jordanSlashActiveTimer || 0) > 0) return;
    const player = game.player || enemy;
    enemy.jordanSlashAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.jordanSlashRadius = jordanDomainRadius * jordanSlashRadiusScale;
    enemy.jordanSlashWarnTimer = jordanSlashWarnDuration;
    enemy.jordanSlashWarnMax = jordanSlashWarnDuration;
    enemy.jordanSlashHitPlayer = false;
    enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, 0.22);
  }

  function triggerGaussDeathBeams(enemy) {
    if (!hasEnemyMechanic(enemy, "gaussHalfField") || !enemyInTopHalf(enemy)) return false;
    const player = game.player || enemy;
    const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const sideX = -Math.sin(baseAngle);
    const sideY = Math.cos(baseAngle);
    game.monsterClearDelay = Math.max(game.monsterClearDelay || 0, gaussDeathBeamClearDelay);
    for (let i = -2; i <= 2; i += 1) {
      spawnEnemyLaser({
        orientation: "ray",
        angle: baseAngle,
        sourceX: clamp(enemy.x + sideX * i * 34, arena.left + 12, arena.right - 12),
        sourceY: clamp(enemy.y + sideY * i * 34, arena.top + 12, arena.bottom - 12),
        warningTime: 0.46,
        activeTime: 0.26,
        width: 13,
        damage: 11,
        color: enemy.color,
        ownerId: enemy.id,
        deathBeam: true,
      });
    }
    return true;
  }

  function enemyQuadrantIndex(x, y) {
    const right = x >= monsterMidX();
    const bottom = y >= monsterMidY();
    return (bottom ? 2 : 0) + (right ? 1 : 0);
  }

  function enemyQuadrantCenter(index) {
    const left = index % 2 === 0;
    const top = index < 2;
    const x0 = left ? arena.left : monsterMidX();
    const x1 = left ? monsterMidX() : arena.right;
    const y0 = top ? arena.top : monsterMidY();
    const y1 = top ? monsterMidY() : arena.bottom;
    return {
      x: (x0 + x1) / 2 + (Math.random() - 0.5) * 70,
      y: (y0 + y1) / 2 + (Math.random() - 0.5) * 48,
    };
  }

  function updateQuadrantBlink(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "quadrantBlink")) return;
    if (enemy.quadrantWarnTimer > 0) {
      enemy.quadrantWarnTimer -= dt;
      if (enemy.quadrantWarnTimer <= 0) {
        enemy.baseX = clamp(enemy.quadrantTargetX, arena.left + 48, arena.right - 48);
        enemy.baseY = clamp(enemy.quadrantTargetY, arena.top + 48, arena.bottom - 48);
        enemy.x = enemy.baseX;
        enemy.y = enemy.baseY;
        enemy.moveT = 0;
        burst(enemy.x, enemy.y, enemy.color || colors.cyan, 18);
        enemy.quadrantTimer = 5.0;
      }
      return;
    }
    if (enemy.quadrantTimer == null) enemy.quadrantTimer = 5.0;
    enemy.quadrantTimer -= dt;
    if (enemy.quadrantTimer <= 0) {
      const current = enemyQuadrantIndex(enemy.x, enemy.y);
      const next = (current + 1 + Math.floor(Math.random() * 3)) % 4;
      const target = enemyQuadrantCenter(next);
      enemy.quadrantTargetX = target.x;
      enemy.quadrantTargetY = target.y;
      enemy.quadrantWarnTimer = 1.0;
      enemy.quadrantWarnMax = 1.0;
      enemy.quadrantTimer = 99;
    }
  }

  function updateDashScatter(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "dashScatter")) return;
    if (enemy.dashWarnTimer > 0) {
      enemy.dashWarnTimer -= dt;
      if (enemy.dashWarnTimer <= 0) {
        enemy.dashFromX = enemy.x;
        enemy.dashFromY = enemy.y;
        enemy.dashActiveTimer = 0.34;
        enemy.dashActiveMax = 0.34;
        enemy.dashTrailTimer = 0;
        enemy.dashHitPlayer = false;
        fireEuclidDashVolley(enemy);
      }
      return;
    }
    if ((enemy.dashActiveTimer || 0) > 0) return;
    if (enemy.dashSequenceRemaining > 0) return;
    const dashIntervalMultiplier = enemy.dashIntervalMultiplier || 1;
    if (enemy.dashTimer == null) enemy.dashTimer = 3.0 * dashIntervalMultiplier;
    enemy.dashTimer -= dt;
    if (enemy.dashTimer <= 0) {
      enemy.dashSequenceRemaining = 2;
      enemy.dashSequenceDirection = Math.random() < 0.5 ? -1 : 1;
      queueEuclidDashStep(enemy, 0.58);
    }
  }

  function queueEuclidDashStep(enemy, warningTime = 0.38) {
    const player = game.player;
    const baseAngle = player ? Math.atan2(player.y - enemy.y, player.x - enemy.x) : enemy.facingAngle || 0;
    const sideAngle = baseAngle + (enemy.dashSequenceDirection || 1) * Math.PI / 2;
    const target = arenaPoint(
      enemy.x + Math.cos(baseAngle) * 38 + Math.cos(sideAngle) * 112,
      enemy.y + Math.sin(baseAngle) * 38 + Math.sin(sideAngle) * 112,
      36
    );
    enemy.facingAngle = baseAngle;
    enemy.dashTargetX = target.x;
    enemy.dashTargetY = target.y;
    enemy.dashWarnTimer = warningTime;
    enemy.dashWarnMax = warningTime;
  }

  function fireEuclidDashVolley(enemy) {
    const base = enemy.facingAngle || 0;
    const squareSlots = new Set([1, 4, 7].map((slot) => (slot + Math.floor(Math.random() * 10)) % 10));
    for (let i = 0; i < 10; i += 1) {
      const square = squareSlots.has(i);
      const angle = base + (Math.PI * 2 * i) / 10;
      fireEnemyShot(enemy, enemy.x, enemy.y, angle, square ? 142 : 126, square ? 8.5 : 6.5, enemy.color, {
        r: square ? 7 : 4.5,
        shape: square ? "square" : "circle",
        weaponSeal: square,
        weaponSealSourceId: square ? enemy.id : "",
        life: 3.1,
      });
    }
  }

  function updateGaussHalfField(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "gaussHalfField")) return;
    if (enemy.gaussHalfTimer == null) {
      enemy.gaussHalfTop = enemyInTopHalf(enemy);
      enemy.gaussHalfTimer = 2.0 + Math.random() * 0.6;
    }
    enemy.gaussHalfTimer -= dt;
    if (enemy.gaussHalfTimer <= 0) {
      enemy.gaussHalfTop = !enemy.gaussHalfTop;
      enemy.gaussHalfTimer = 3.0 + Math.random() * 0.8;
    }
    const targetY = enemy.gaussHalfTop
      ? arena.top + arena.height * 0.25
      : arena.top + arena.height * 0.72;
    enemy.baseY += (targetY - enemy.baseY) * Math.min(1, dt * 2.0);
    if (!enemyInTopHalf(enemy)) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.026 * dt);
      if (enemy.hp <= enemy.maxHp * 0.1) {
        enemy.hp = enemy.maxHp * 0.1;
        enemy.healFlash = Math.max(enemy.healFlash || 0, 0.12);
      }
    }
  }

  function updateTaylorTripleDash(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "taylorTripleDash")) return;
    enemy.taylorRestTimer = Math.max(0, (enemy.taylorRestTimer || 0) - dt);
    if (enemy.taylorRestTimer > 0 || (enemy.taylorDashActiveTimer || 0) > 0) return;
    if ((enemy.taylorDashWarnTimer || 0) > 0) {
      enemy.taylorDashWarnTimer = Math.max(0, enemy.taylorDashWarnTimer - dt);
      if (enemy.taylorDashWarnTimer <= 0) {
        startTaylorDash(enemy);
      }
      return;
    }
    if (enemy.taylorDashTimer == null) enemy.taylorDashTimer = 1.4 + Math.random() * 0.6;
    enemy.taylorDashTimer -= dt;
    if (enemy.taylorDashTimer <= 0) {
      enemy.taylorDashPoints = createTaylorDashPoints(enemy);
      beginTaylorDashStep(enemy);
      enemy.taylorDashTimer = 99;
    }
  }

  function updateJacobiVolley(enemy, dt) {
    if ((enemy.jacobiVolleyWaves || 0) <= 0) return;
    enemy.jacobiVolleyTimer = (enemy.jacobiVolleyTimer || 0) - dt;
    while ((enemy.jacobiVolleyWaves || 0) > 0 && enemy.jacobiVolleyTimer <= 0) {
      fireJacobiWave(enemy);
      enemy.jacobiVolleyWaves -= 1;
      enemy.jacobiVolleyTimer += 0.16;
    }
  }

  function updateJacobiBackBlink(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "jacobiBackBlink")) return;
    if ((enemy.jacobiBlinkWarnTimer || 0) > 0) {
      enemy.jacobiBlinkWarnTimer = Math.max(0, enemy.jacobiBlinkWarnTimer - dt);
      if (enemy.jacobiBlinkWarnTimer <= 0) {
        const target = enemy.jacobiBlinkTarget || jacobiBlinkTarget(enemy);
        enemy.baseX = clamp(target.x, arena.left + 42, arena.right - 42);
        enemy.baseY = clamp(target.y, arena.top + 42, arena.bottom - 42);
        enemy.x = enemy.baseX;
        enemy.y = enemy.baseY;
        enemy.moveT = 0;
        enemy.jacobiLandingTimer = 0.35;
        enemy.fireTimer = Math.max(enemy.fireTimer || 0, 0.72);
        scheduleJacobiVolley(enemy, 1.5);
        burst(enemy.x, enemy.y, enemy.color || colors.warning, 18);
      }
      return;
    }
    enemy.jacobiLandingTimer = Math.max(0, (enemy.jacobiLandingTimer || 0) - dt);
    if (enemy.jacobiBlinkTimer == null) enemy.jacobiBlinkTimer = 3.7 + Math.random() * 0.9;
    enemy.jacobiBlinkTimer -= dt;
    if (enemy.jacobiBlinkTimer <= 0) {
      enemy.jacobiBlinkTarget = jacobiBlinkTarget(enemy);
      enemy.jacobiBlinkWarnTimer = 0.46;
      enemy.jacobiBlinkWarnMax = 0.46;
      enemy.jacobiBlinkTimer = 5.0 + Math.random() * 1.0;
    }
  }

  function updateJordanDomain(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "jordanDomain")) return;
    if ((enemy.jordanTransitionTimer || 0) > 0) {
      enemy.jordanTransitionTimer = Math.max(0, enemy.jordanTransitionTimer - dt);
      if (enemy.jordanTransitionTimer <= 0) {
        enemy.jordanDomainActive = true;
        enemy.fireTimer = Math.min(enemy.fireTimer || enemy.fireEvery, 0.32);
        burst(enemy.x, enemy.y, enemy.color || colors.warning, 28);
      }
      return;
    }
    if (!enemy.jordanDomainActive) return;
    const player = game.player;
    if (!player) return;
    enemy.jordanDomainTick = Math.max(0, (enemy.jordanDomainTick || 0) - dt);
    if (distance(player, enemy) > jordanDomainRadius && enemy.jordanDomainTick <= 0) {
      applyPlayerDamage(scaledIncomingDamage(2 * jordanDomainTickEvery), enemy.color || colors.warning);
      player.invuln = Math.max(player.invuln, 0.22);
      enemy.jordanDomainTick = jordanDomainTickEvery;
    }
  }

  function updateJordanHalfSlash(enemy, dt) {
    if (!hasEnemyMechanic(enemy, "jordanDomain")) return;
    enemy.jordanSlashActiveTimer = Math.max(0, (enemy.jordanSlashActiveTimer || 0) - dt);
    if ((enemy.jordanSlashWarnTimer || 0) <= 0) return;
    enemy.jordanSlashWarnTimer = Math.max(0, enemy.jordanSlashWarnTimer - dt);
    if (enemy.jordanSlashWarnTimer > 0) return;

    enemy.jordanSlashActiveTimer = 0.18;
    const player = game.player;
    const radius = enemy.jordanSlashRadius || jordanDomainRadius * jordanSlashRadiusScale;
    if (player && player.invuln <= 0 && distance(player, enemy) <= player.r + radius) {
      const targetAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      if (Math.abs(angleDelta(targetAngle, enemy.jordanSlashAngle || 0)) <= Math.PI / 2) {
        applyPlayerDamage(scaledIncomingDamage(jordanSlashDamage * enemyDamageMultiplier(enemy)), enemy.color || colors.warning);
        player.invuln = Math.max(player.invuln, 0.62);
        enemy.jordanSlashHitPlayer = true;
      }
    }
    burst(
      enemy.x + Math.cos(enemy.jordanSlashAngle || 0) * radius * 0.52,
      enemy.y + Math.sin(enemy.jordanSlashAngle || 0) * radius * 0.52,
      enemy.color || colors.warning,
      16
    );
  }

  function updateEnemyMechanics(enemy, dt) {
    enemy.backHitFlash = Math.max(0, (enemy.backHitFlash || 0) - dt);
    enemy.shieldFlash = Math.max(0, (enemy.shieldFlash || 0) - dt);
    enemy.healFlash = Math.max(0, (enemy.healFlash || 0) - dt);
    updateLhopitalBlade(enemy, dt);
    updateQuadrantBlink(enemy, dt);
    updateDashScatter(enemy, dt);
    updateGaussHalfField(enemy, dt);
    updateTaylorTripleDash(enemy, dt);
    updateArchimedesMarkDash(enemy, dt);
    updateJacobiVolley(enemy, dt);
    updateJacobiBackBlink(enemy, dt);
    updateJordanDomain(enemy, dt);
    updateJordanHalfSlash(enemy, dt);
  }

  function spawnDashTrail(enemy) {
    const angle = Math.atan2(enemy.dashTargetY - enemy.dashFromY, enemy.dashTargetX - enemy.dashFromX);
    [-1, 1].forEach((direction) => {
      fireEnemyShot(enemy, enemy.x, enemy.y, angle + direction * Math.PI / 2, 118, 7, enemy.color, {
        r: 5,
        life: 2.2,
        weaponSeal: true,
      });
    });
  }

  function updateEnemyPosition(enemy, dt) {
    if ((enemy.lhopitalSlashActiveTimer || 0) > 0 && enemy.lhopitalSlashFromX != null && enemy.lhopitalSlashTargetX != null) {
      enemy.lhopitalSlashActiveTimer = Math.max(0, enemy.lhopitalSlashActiveTimer - dt);
      const progress = 1 - enemy.lhopitalSlashActiveTimer / Math.max(0.001, enemy.lhopitalSlashActiveMax || 0.24);
      const eased = 1 - Math.pow(1 - clamp(progress, 0, 1), 2.2);
      enemy.x = enemy.lhopitalSlashFromX + (enemy.lhopitalSlashTargetX - enemy.lhopitalSlashFromX) * eased;
      enemy.y = enemy.lhopitalSlashFromY + (enemy.lhopitalSlashTargetY - enemy.lhopitalSlashFromY) * eased;
      enemy.lhopitalTrailTimer = (enemy.lhopitalTrailTimer || 0) - dt;
      if (enemy.lhopitalTrailTimer <= 0) {
        enemy.lhopitalTrailTimer = 0.055;
        burst(enemy.x, enemy.y, enemy.color || colors.paper, 3);
      }
      const player = game.player;
      if (player && !enemy.lhopitalSlashHitPlayer && player.invuln <= 0 && distance(player, enemy) <= player.r + enemy.r + 9 * characterSizeScale) {
        applyPlayerDamage(scaledIncomingDamage(14 * enemyDamageMultiplier(enemy)), enemy.color || colors.paper);
        player.invuln = Math.max(player.invuln, 0.62);
        enemy.lhopitalSlashHitPlayer = true;
      }
      if (enemy.lhopitalSlashActiveTimer <= 0) {
        finishLhopitalSlash(enemy);
      }
      return;
    }
    if ((enemy.archimedesDashActiveTimer || 0) > 0 && enemy.archimedesDashFromX != null && enemy.archimedesDashTargetX != null) {
      enemy.archimedesDashActiveTimer = Math.max(0, enemy.archimedesDashActiveTimer - dt);
      const progress = 1 - enemy.archimedesDashActiveTimer / Math.max(0.001, enemy.archimedesDashActiveMax || 0.36);
      const eased = 1 - Math.pow(1 - clamp(progress, 0, 1), 2.5);
      enemy.x = enemy.archimedesDashFromX + (enemy.archimedesDashTargetX - enemy.archimedesDashFromX) * eased;
      enemy.y = enemy.archimedesDashFromY + (enemy.archimedesDashTargetY - enemy.archimedesDashFromY) * eased;
      enemy.archimedesTrailTimer = (enemy.archimedesTrailTimer || 0) - dt;
      if (enemy.archimedesTrailTimer <= 0) {
        enemy.archimedesTrailTimer = 0.045;
        burst(enemy.x, enemy.y, enemy.color || colors.cyan, 4);
      }
      const player = game.player;
      if (player && !enemy.archimedesDashHitPlayer && player.invuln <= 0 && distance(player, enemy) <= player.r + enemy.r + 8 * characterSizeScale) {
        applyPlayerDamage(scaledIncomingDamage(20 * enemyDamageMultiplier(enemy)), enemy.color || colors.cyan);
        player.invuln = Math.max(player.invuln, 0.75);
        enemy.archimedesDashHitPlayer = true;
      }
      if (enemy.archimedesDashActiveTimer <= 0) {
        finishArchimedesDash(enemy);
      }
      return;
    }
    if ((enemy.taylorDashActiveTimer || 0) > 0 && enemy.taylorDashFromX != null && enemy.taylorDashTargetX != null) {
      enemy.taylorDashActiveTimer = Math.max(0, enemy.taylorDashActiveTimer - dt);
      const progress = 1 - enemy.taylorDashActiveTimer / Math.max(0.001, enemy.taylorDashActiveMax || 0.3);
      const eased = 1 - Math.pow(1 - clamp(progress, 0, 1), 2.4);
      enemy.x = enemy.taylorDashFromX + (enemy.taylorDashTargetX - enemy.taylorDashFromX) * eased;
      enemy.y = enemy.taylorDashFromY + (enemy.taylorDashTargetY - enemy.taylorDashFromY) * eased;
      enemy.taylorTrailTimer = (enemy.taylorTrailTimer || 0) - dt;
      if (enemy.taylorTrailTimer <= 0) {
        enemy.taylorTrailTimer = 0.055;
        burst(enemy.x, enemy.y, enemy.color || colors.chalk, 3);
      }
      const player = game.player;
      if (player && !enemy.taylorDashHitPlayer && player.invuln <= 0 && distance(player, enemy) <= player.r + enemy.r + 5 * characterSizeScale) {
        applyPlayerDamage(scaledIncomingDamage(22), enemy.color || colors.chalk);
        player.invuln = Math.max(player.invuln, 0.82);
        enemy.taylorDashHitPlayer = true;
      }
      if (enemy.taylorDashActiveTimer <= 0) {
        finishTaylorDashStep(enemy);
      }
      return;
    }
    if ((enemy.dashActiveTimer || 0) > 0 && enemy.dashFromX != null && enemy.dashTargetX != null) {
      enemy.dashActiveTimer = Math.max(0, enemy.dashActiveTimer - dt);
      const progress = 1 - enemy.dashActiveTimer / Math.max(0.001, enemy.dashActiveMax || 0.34);
      const eased = 1 - Math.pow(1 - clamp(progress, 0, 1), 2);
      enemy.x = enemy.dashFromX + (enemy.dashTargetX - enemy.dashFromX) * eased;
      enemy.y = enemy.dashFromY + (enemy.dashTargetY - enemy.dashFromY) * eased;
      enemy.dashTrailTimer = (enemy.dashTrailTimer || 0) - dt;
      if (enemy.dashTrailTimer <= 0) {
        enemy.dashTrailTimer = 0.075;
        if (hasEnemyMechanic(enemy, "dashScatter")) {
          burst(enemy.x, enemy.y, enemy.color || colors.cyan, 3);
        } else {
          spawnDashTrail(enemy);
        }
      }
      const player = game.player;
      if (player && !enemy.dashHitPlayer && player.invuln <= 0 && distance(player, enemy) <= player.r + enemy.r + 3 * characterSizeScale) {
        applyPlayerDamage(scaledIncomingDamage(15 * enemyDamageMultiplier(enemy)), enemy.color || colors.cyan);
        player.invuln = Math.max(player.invuln, 0.75);
        enemy.dashHitPlayer = true;
        sealPlayerNonGeometryWeapons(weaponSealDuration);
      }
      if (enemy.dashActiveTimer <= 0) {
        enemy.baseX = enemy.x;
        enemy.baseY = enemy.y;
        enemy.moveT = 0;
        if (hasEnemyMechanic(enemy, "dashScatter") && (enemy.dashSequenceRemaining || 0) > 1) {
          enemy.dashSequenceRemaining -= 1;
          enemy.dashSequenceDirection = -(enemy.dashSequenceDirection || 1);
          queueEuclidDashStep(enemy, 0.26);
        } else if (hasEnemyMechanic(enemy, "dashScatter")) {
          enemy.dashSequenceRemaining = 0;
          enemy.dashTimer = 3.0;
        }
      }
      return;
    }
    if ((enemy.taylorRestTimer || 0) > 0) {
      enemy.x = enemy.baseX;
      enemy.y = enemy.baseY;
      return;
    }
    if ((enemy.lhopitalRestTimer || 0) > 0) {
      enemy.x = enemy.baseX;
      enemy.y = enemy.baseY;
      return;
    }
    if (enemy.randomDrift) {
      const driftIntervalMultiplier = enemy.driftIntervalMultiplier || 1;
      enemy.driftTimer = (enemy.driftTimer || 0) - dt;
      if (enemy.driftTimer <= 0 || enemy.driftTargetX == null) {
        const point = randomArenaPoint(44);
        enemy.driftTargetX = point.x;
        enemy.driftTargetY = point.y;
        enemy.driftTimer = (0.75 + Math.random() * 0.65) * driftIntervalMultiplier;
      }
      enemy.baseX += (enemy.driftTargetX - enemy.baseX) * Math.min(1, dt * 1.8);
      enemy.baseY += (enemy.driftTargetY - enemy.baseY) * Math.min(1, dt * 1.8);
      enemy.x = enemy.baseX + Math.sin(enemy.moveT * enemy.moveSpeed * 1.35) * 14;
      enemy.y = enemy.baseY + Math.cos(enemy.moveT * enemy.moveSpeed * 1.1) * 10;
      return;
    }
    enemy.x = enemy.baseX + Math.sin(enemy.moveT * enemy.moveSpeed) * enemy.moveAmp;
    enemy.y = enemy.baseY + Math.cos(enemy.moveT * enemy.moveSpeed * 0.7) * 18;
  }

  function onEnemyAttackHitPlayer(source) {
    if (source?.weaponSeal) {
      sealPlayerNonGeometryWeapons(source.weaponSealSourceId ? 999 : weaponSealDuration, source.weaponSealSourceId || "");
    }
    if (source?.cauchySlow) {
      applyEnemySlow(0.72, cauchyDotDuration);
    }
    if (source?.cauchyDot) {
      game.player.cauchyDotTimer = Math.max(game.player.cauchyDotTimer || 0, cauchyDotDuration);
      game.player.cauchyDotTick = Math.min(game.player.cauchyDotTick || 0.5, 0.5);
    }
    if (source?.gaussZone && game.boss) {
      triggerGaussHitRetaliation(bossCoreById("gauss"));
      applyEnemySlow(0.78, gaussZoneDebuffDuration);
      game.player.cauchyDotTimer = Math.max(game.player.cauchyDotTimer || 0, gaussZoneDebuffDuration);
      game.player.cauchyDotTick = Math.min(game.player.cauchyDotTick || 0.5, 0.5);
    }
  }

  function splitSpawnPoint(enemy, side) {
    const player = game.player || enemy;
    const baseDistance = Math.max(52, distance(player, enemy));
    const targetDistance = baseDistance * 2.05;
    const away = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const direct = arenaPoint(
      player.x + Math.cos(away + side * 0.55) * targetDistance,
      player.y + Math.sin(away + side * 0.55) * targetDistance,
      34
    );
    let best = direct;
    let bestDistance = distance(player, direct);
    for (let i = 0; i < 14; i += 1) {
      const angle = away + side * 0.35 + (Math.random() - 0.5) * Math.PI;
      const radius = targetDistance * (0.72 + Math.random() * 0.5);
      const candidate = arenaPoint(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius, 34);
      const candidateDistance = distance(player, candidate);
      if (candidateDistance > bestDistance) {
        best = candidate;
        bestDistance = candidateDistance;
      }
    }
    return best;
  }

  function spawnSplitEnemies(enemy) {
    if (!hasEnemyMechanic(enemy, "splitOnDeath") || enemy.splitChild) return false;
    const childHp = Math.max(18, Math.round(enemy.maxHp * lagrangeChildHpMultiplier));
    [-1, 1].forEach((side, index) => {
      const point = splitSpawnPoint(enemy, side);
      const child = {
        ...enemy,
        id: `${enemy.id}-split-${index}`,
        x: point.x,
        y: point.y,
        baseX: point.x,
        baseY: point.y,
        r: Math.max(16 * characterSizeScale, enemy.r * 0.76),
        hp: childHp,
        maxHp: childHp,
        moveT: side * 1.2,
        moveAmp: Math.max(44, enemy.moveAmp * 0.78),
        moveSpeed: enemy.moveSpeed * 1.42,
        fireEvery: enemy.fireEvery,
        fireTimer: 0.48 + index * 0.28,
        mechanics: (enemy.mechanics || []).filter((mechanic) => mechanic !== "splitOnDeath"),
        splitChild: true,
        randomDrift: true,
        driftTimer: 0,
        driftIntervalMultiplier: 0.78,
        dashIntervalMultiplier: 1,
        shieldFlash: 0,
        healFlash: 0,
        defeated: false,
      };
      game.enemies.push(child);
    });
    burst(enemy.x, enemy.y, enemy.color || colors.chalk, 24);
    return true;
  }

  function defeatEnemy(enemy) {
    triggerGaussDeathBeams(enemy);
    const didSplit = spawnSplitEnemies(enemy);
    enemy.defeated = true;
    clearWeaponSealFromSource(enemy.id);
    game.kills += 1;
    game.defeatedInRoom += 1;
    burst(enemy.x, enemy.y, didSplit ? colors.paper : enemy.color, didSplit ? 32 : 28);
  }

  function tryCompleteMonsterChallenge(dt = 0) {
    if (game.enemies.length) return false;
    if ((game.monsterClearDelay || 0) > 0) {
      game.monsterClearDelay = Math.max(0, game.monsterClearDelay - dt);
      if (game.monsterClearDelay > 0) return false;
    }
    completeMonsterChallenge();
    return true;
  }

  function updateMonsterRoom(dt) {
    if (!game.enemies.length) {
      tryCompleteMonsterChallenge(dt);
      return;
    }

    game.enemies.forEach((enemy) => {
      if (enemy.defeated) return;
      enemy.moveT += dt;
      updateEnemyMechanics(enemy, dt);
      const previousX = enemy.x;
      const previousY = enemy.y;
      updateEnemyPosition(enemy, dt);
      updateEnemyFacing(enemy, previousX, previousY);
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        enemy.fireTimer = enemy.fireEvery;
        fireEnemyPattern(enemy);
      }

      applyPlayerDamageToCircle(enemy, "enemy");
      if (enemy.hp <= 0) {
        if (lockGaussBottomHp(enemy) || ((enemy.jordanTransitionTimer || 0) > 0)) {
          return;
        }
        defeatEnemy(enemy);
      }
    });

    game.enemies = game.enemies.filter((enemy) => !enemy.defeated);
    if (!game.enemies.length) {
      tryCompleteMonsterChallenge(dt);
    }
  }

  function completeMonsterChallenge() {
    if (!game.activeRoomKey || game.completed[game.activeRoomKey]) return;
    if (isDeveloperCustomRoom()) {
      const defeated = Math.max(0, game.defeatedInRoom || 0);
      game.player.weaponSealSourceId = "";
      game.player.weaponSealTimer = 0;
      showClear(
        "开发者模式",
        "自定义房间测试完成",
        `本次共击败 ${defeated} 个测试目标，没有结算奖励，也不会记录排行榜。`,
        null,
      );
      return;
    }
    const reward = game.roomReward || {};
    const player = game.player;
    const count = clamp(game.challengeCount || 1, 1, 3);
    const rewardBuffs = [];
    let weaponName = "";
    let weaponAction = "获得正常版武器";

    game.completed[game.activeRoomKey] = true;
    player.weaponSealSourceId = "";
    player.weaponSealTimer = 0;

    if (reward.weapon) {
      const equivalentIds = weaponFamilyIds(reward.weapon);
      const existingWeapon = player.weapons.find((weapon) => equivalentIds.includes(weapon.id));
      if (existingWeapon) {
        weaponAction = "强化重复武器";
      }
      weaponName = weaponChoiceName(reward.weapon);
    }

    if (count >= 2) {
      rewardBuffs.push(pickChallengeBuff(rewardBuffs));
    }
    if (count >= 3) {
      const extraBuff = pickChallengeBuff(rewardBuffs);
      rewardBuffs.push(extraBuff);
    }
    const creditGain = awardBetaKnowledgeCredits(game.activeRoomKey, count);

    const weaponText = weaponName ? `${weaponAction}：${weaponName}` : "获得战斗奖励";
    const buffText = rewardBuffs.length ? `，可选增益：${rewardBuffs.join("、")}` : "";
    const creditText = creditGain
      ? `获得 ${creditGain} 学分，当前 ${game.credits} 学分。`
      : "";
    const clearText = rewardBuffs.length
      ? `挑战 ${count} 人完成，${weaponText}${buffText}。${creditText}可以勾选武器和一个增益，确认后领取。`
      : `挑战 ${count} 人完成，${weaponText}。${creditText}勾选后确认领取，也可以直接离开。`;
    showClear(
      reward.clearEyebrow || "怪物房",
      reward.clearTitle || "知识投影被击败",
      clearText,
      weaponName || rewardBuffs.length
        ? {
          weaponId: reward.weapon,
          buffIds: rewardBuffs,
          altBuff: rewardBuffs[0],
          allowWeaponWithBuff: Boolean(weaponName && rewardBuffs.length),
          title: `奖励选择：${[weaponName, rewardBuffs.length ? rewardBuffs.join("、") : ""].filter(Boolean).join(" / ")}`,
          acceptLabel: "武器",
          weaponShortLabel: "武器",
          buffLabel: "增益",
          confirmLabel: "确认领取",
          acceptText: `已加入背包：${weaponName}。`,
          declineText: `你没有领取本房间奖励。${weaponName ? `没有加入${weaponName}，本局仍保留圣剑榜资格。` : ""}`,
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
    const options = ["学霸笔记", "公式大全", "熬夜咖啡", "草稿纸", "错题本", "绩点守护", "临时抱佛脚", "鸡煲"];
    const available = options.filter((name) => !excluded.includes(name));
    const source = available.length ? available : options;
    return source[Math.floor(Math.random() * source.length)];
  }

  function fireEnemyPattern(enemy) {
    const baseAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
    const fire = (x, y, angle, speed, damage, color = enemy.color, options = {}) => {
      fireEnemyShot(enemy, x, y, angle, speed, damage, color, options);
    };
    if (enemy.pattern === "none") {
      return;
    }
    if (enemy.pattern === "burstTen") {
      const count = enemy.splitChild ? 2 : 8;
      const spread = enemy.splitChild ? 0.28 : 0.86;
      for (let i = 0; i < count; i += 1) {
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
        const baseSpeed = enemy.splitChild ? 166 * lagrangeChildShotSpeedMultiplier : 166;
        fire(enemy.x, enemy.y, baseAngle + offset, baseSpeed + Math.abs(offset) * 32, 8.2, enemy.color, {
          r: 4.5,
          life: 4.0,
        });
      }
      return;
    }
    if (enemy.pattern === "jacobiVolley") {
      if ((enemy.jacobiVolleyWaves || 0) <= 0) {
        scheduleJacobiVolley(enemy, 1);
      }
      return;
    }
    if (enemy.pattern === "jordanReactive") {
      if (enemy.jordanDomainActive) {
        fireJordanHalfSlash(enemy);
      } else {
        fireJordanRing(enemy, false);
      }
      return;
    }
    if (enemy.pattern === "archimedesTriangle") {
      if ((enemy.archimedesDashWarnTimer || 0) > 0 || (enemy.archimedesDashActiveTimer || 0) > 0) return;
      if ((enemy.archimedesWallDashCount || 0) >= archimedesWallDashLimit) {
        scheduleArchimedesDash(enemy, { x: game.player.x, y: game.player.y }, false, archimedesPlayerLockWarning);
        return;
      }
      fire(enemy.x, enemy.y, baseAngle, 298, 10.5, enemy.color, {
        shape: "triangle",
        r: 8,
        life: 3.0,
        archimedesMark: true,
      });
      return;
    }
    if (enemy.pattern === "axisLaser") {
      spawnEnemyLaser({
        orientation: "vertical",
        x: clamp(game.player.x, arena.left + 24, arena.right - 24),
        warningTime: 0.52,
        activeTime: 0.28,
        width: 15,
        damage: 12 * enemyDamageMultiplier(enemy),
        color: enemy.color,
        sourceX: enemy.x,
        sourceY: enemy.y,
        ownerId: enemy.id,
      });
      spawnEnemyLaser({
        orientation: "horizontal",
        y: clamp(game.player.y, arena.top + 24, arena.bottom - 24),
        warningTime: 0.52,
        activeTime: 0.28,
        width: 15,
        damage: 12 * enemyDamageMultiplier(enemy),
        color: enemy.color,
        sourceX: enemy.x,
        sourceY: enemy.y,
        ownerId: enemy.id,
      });
      return;
    }
    if (enemy.pattern === "wall") {
      const sideX = -Math.sin(baseAngle);
      const sideY = Math.cos(baseAngle);
      for (let i = -2; i <= 2; i += 1) {
        fire(enemy.x + sideX * i * 24, enemy.y + sideY * i * 24, baseAngle, 150 + Math.abs(i) * 12, 10);
      }
      return;
    }
    for (let i = -1; i <= 1; i += 1) {
      fire(enemy.x, enemy.y, baseAngle + i * 0.22, 170, 10);
    }
  }

  function updateBoss(dt) {
    const boss = game.boss;
    if (!boss) return;

    advanceBossIntro(boss, dt);
    updateBossDeaths(boss);
    updateBossMovement(boss, dt);

    boss.cores.forEach((core) => {
      core.hitFlash = Math.max(0, (core.hitFlash || 0) - dt);
      core.guardFlash = Math.max(0, (core.guardFlash || 0) - dt);
      core.overloadFlash = Math.max(0, (core.overloadFlash || 0) - dt);
      core.healFlash = Math.max(0, (core.healFlash || 0) - dt);
      core.invisibleTimer = Math.max(0, (core.invisibleTimer || 0) - dt);
      core.revealTimer = Math.max(0, (core.revealTimer || 0) - dt);
    });

    updateBossDomain(boss, dt);
    updateBossFullPower(boss, dt);
    updateCauchyBombs(boss, dt);

    const aliveCores = boss.cores.filter((core) => core.hp > 0);
    const activeCores = bossActiveCores(boss, aliveCores);
    if (!aliveCores.length) {
      finishGame(true);
      return;
    }

    updateBossObstacles(boss, dt);
    updateBossProjections(dt);

    const attackingPaused = isBossIntroActive() || boss.rotating;
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
      applyPlayerDamageToCircle({ ...core, x: pos.x, y: pos.y, r: bossCoreHitRadius }, "boss", core);
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

  function isBossCoreRevealed(core) {
    return Boolean(core && (core.revealTimer || 0) > 0);
  }

  function isBossCoreHidden(core) {
    return Boolean(core && core.hp > 0 && (core.invisibleTimer || 0) > 0 && !isBossCoreRevealed(core));
  }

  function updateBossMovement(boss, dt) {
    if (isBossIntroActive()) return;
    boss.moveT = (boss.moveT || 0) + dt;
    const path = boss.movePath?.length >= 3
      ? boss.movePath
      : [
        { x: boss.moveBaseX || W * 0.5, y: boss.moveBaseY || H * 0.28 },
        { x: W * 0.36, y: H * 0.39 },
        { x: W * 0.64, y: H * 0.39 },
      ];
    const cycle = Math.max(3, boss.moveCycle || 10);
    const segmentProgress = ((boss.moveT % cycle) / cycle) * path.length;
    const index = Math.floor(segmentProgress) % path.length;
    const nextIndex = (index + 1) % path.length;
    const local = easeInOut(segmentProgress - Math.floor(segmentProgress));
    const from = path[index];
    const to = path[nextIndex];
    boss.x = clamp(from.x + (to.x - from.x) * local, arena.left + 160 * bossSizeScale, arena.right - 160 * bossSizeScale);
    boss.y = clamp(from.y + (to.y - from.y) * local, arena.top + 130 * bossSizeScale, arena.bottom - 230 * bossSizeScale);
  }

  function bossCoreById(id) {
    return game.boss?.cores.find((core) => core.id === id);
  }

  function bossTopCore(boss = game.boss) {
    if (!boss) return null;
    return boss.cores
      .filter((core) => core.hp > 0)
      .map((core) => ({ core, pos: corePosition(core) }))
      .sort((a, b) => a.pos.y - b.pos.y)
      .map((item) => item.core)[0] || null;
  }

  function aliveBossCoreCount(boss = game.boss) {
    return boss?.cores.filter((core) => core.hp > 0).length || 0;
  }

  function isBossCoreInDomain(core, boss = game.boss) {
    return Boolean(boss && core && core.hp > 0 && aliveBossCoreCount(boss) > 1 && boss.domainCoreId === core.id && !boss.rotating);
  }

  function bossFrontCoreIds(boss = game.boss) {
    if (!boss) return [];
    return boss.cores
      .filter((core) => core.hp > 0 && !isBossCoreInDomain(core, boss))
      .map((core) => core.id);
  }

  function isBossCoreFront(core, boss = game.boss) {
    if (!boss || !core || core.hp <= 0) return false;
    return !isBossCoreInDomain(core, boss);
  }

  function bossActiveCores(boss = game.boss, cores = null) {
    const source = cores || boss?.cores || [];
    return source.filter((core) => core.hp > 0 && !isBossCoreInDomain(core, boss));
  }

  function updateBossDomain(boss, dt) {
    if (isBossIntroActive()) return;
    if (!boss.domainCoreId && !boss.rotating) {
      startBossDomain(boss, bossCoreById(boss.initialDomainCoreId) || bossTopCore(boss));
      boss.initialDomainCoreId = "";
    }
    if (boss.domainCoreId) {
      boss.domainElapsed = (boss.domainElapsed || 0) + dt;
    }
    updateBossRotation(boss, dt);
    updateGaussZones(boss, dt);
    if (boss.domainCoreId === "descartes") {
      updateDescartesDomain(boss, dt);
    }
  }

  function startBossDomain(boss, core) {
    if (!boss || !core || core.hp <= 0) return;
    if (boss.domainCoreId && boss.domainCoreId !== core.id) {
      endBossDomain(boss);
    }
    boss.domainCoreId = core.id;
    boss.domainName = core.name;
    boss.domainElapsed = 0;
    boss.domainIndex = (boss.domainIndex || 0) + 1;
    const pos = corePosition(core);
    burst(pos.x, pos.y, core.color, 26);

    if (core.id === "cauchy") {
      enterCauchyDomain(boss);
    } else if (core.id === "gauss") {
      enterGaussDomain(boss, core);
    } else if (core.id === "descartes") {
      enterDescartesDomain(boss);
    }
  }

  function endBossDomain(boss) {
    if (!boss?.domainCoreId) return;
    if (boss.domainCoreId === "cauchy") {
      explodeCauchyDomainWalls(boss);
    }
    if (boss.domainCoreId === "descartes") {
      spawnDescartesExitProjections(boss);
    }
    if (boss.domainCoreId === "gauss") {
      boss.gaussZones = [];
    }
    boss.cores.forEach((core) => {
      if (core.domainShieldBonus) {
        const remainingBonus = Math.min(core.shield || 0, core.domainShieldBonus);
        core.shield = Math.max(0, (core.shield || 0) - remainingBonus);
        core.maxShield = Math.max(0, (core.maxShield || 0) - core.domainShieldBonus);
        core.domainShieldBonus = 0;
      }
      core.domainFireMultiplier = 1;
      core.domainDamageMultiplier = 1;
    });
    boss.domainCoreId = "";
    boss.domainName = "";
    boss.domainElapsed = 0;
    boss.descartesQuadrant = "";
    boss.descartesQuadrantChanges = 0;
    boss.descartesQuadrantProjectionCount = 0;
  }

  function decorateCauchyDomainWall(obstacle) {
    if (!obstacle) return obstacle;
    ensureObstacleId(obstacle, "cauchy-wall");
    obstacle.cauchyDomain = true;
    obstacle.marked = true;
    obstacle.markTimer = 0;
    obstacle.maxMarkTimer = 1;
    obstacle.broken = false;
    return obstacle;
  }

  function enterCauchyDomain(boss) {
    explodeCauchyDomainWalls(boss);
    boss.cauchyBombs = [];
    game.enemyShots = game.enemyShots.filter((shot) => !shot.cauchyMarksWall);
    game.obstacles = game.obstacles.filter((obstacle) => !obstacle.cauchyCoreWall && !obstacle.cauchyDomain);
    replaceBossNeutralObstacles(cauchyDomainWallCount);
    boss.cauchyDomainObstacleIds = [];
    boss.cauchyHighlightTimer = cauchyHighlightEvery;
    boss.cauchyCandidateObstacleIds = game.obstacles
      .filter((obstacle) => !obstacle.cauchyCoreWall && !obstacle.cauchyDomain)
      .slice(0, cauchyDomainWallCount)
      .map((obstacle) => {
        ensureObstacleId(obstacle, "boss-wall");
        obstacle.cauchyCandidate = true;
        return obstacle.id;
      });
    boss.cores.filter((core) => core.hp > 0).forEach((core) => {
      const wall = createCauchyCoreWall(core);
      if (wall) {
        decorateCauchyDomainWall(wall);
        wall.cauchyCoreWall = true;
        game.obstacles.push(wall);
        boss.cauchyDomainObstacleIds.push(wall.id);
      }
    });
  }

  function createCauchyCoreWall(core) {
    const pos = corePosition(core);
    const toward = Math.atan2(game.player.y - pos.y, game.player.x - pos.x);
    const radius = 52;
    const span = Math.PI * 0.72;
    const points = [];
    for (let i = 0; i <= 6; i += 1) {
      const t = i / 6 - 0.5;
      const angle = toward + t * span;
      points.push({
        x: pos.x + Math.cos(angle) * radius,
        y: pos.y + Math.sin(angle) * radius,
      });
    }
    return obstacleFromPoints("curve", points, 8.5);
  }

  function explodeCauchyDomainWalls(boss) {
    const walls = game.obstacles.filter((obstacle) => obstacle.cauchyDomain);
    walls.forEach((wall) => {
      const center = obstacleCenter(wall);
      scatterCauchyWallBullets(center, cauchyExplosionBulletCount);
      burst(center.x, center.y, colors.chalk, 18);
    });
    boss.obstacleBoomCount = (boss.obstacleBoomCount || 0) + walls.length;
    game.obstacles = game.obstacles.filter((obstacle) => !obstacle.cauchyDomain);
    boss.cauchyDomainObstacleIds = [];
    boss.cauchyCandidateObstacleIds = [];
  }

  function scatterCauchyWallBullets(center, count) {
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const angle = base + (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
      spawnEnemyShot(center.x, center.y, angle, 112 + Math.random() * 34, 9, colors.chalk, {
        pattern: "straight",
        shape: "square",
        r: 7,
        life: 3.2,
      });
    }
  }

  function explodeAllBossWallsAsCauchy(boss, bulletCount = cauchyExplosionBulletCount) {
    const walls = game.obstacles.filter((obstacle) => !obstacle.broken);
    if (!walls.length) return;
    for (let i = 0; i < bulletCount; i += 1) {
      const wall = walls[Math.floor(Math.random() * walls.length)];
      scatterCauchyWallBullets(obstacleCenter(wall), 1);
    }
    walls.forEach((wall) => {
      const center = obstacleCenter(wall);
      burst(center.x, center.y, colors.chalk, 12);
    });
    boss.obstacleBoomCount = (boss.obstacleBoomCount || 0) + walls.length;
    game.obstacles = [];
    boss.cauchyDomainObstacleIds = [];
    boss.cauchyCandidateObstacleIds = [];
  }

  function generateCauchyFullPowerWalls(boss) {
    game.obstacles = [];
    boss.cauchyDomainObstacleIds = [];
    boss.cauchyCandidateObstacleIds = [];
    for (let i = 0; i < cauchyFullPowerWallCount; i += 1) {
      const obstacle = createRoomObstacle("boss", game.obstacles, null, i === 0 ? "curve" : null);
      if (!obstacle) continue;
      decorateCauchyDomainWall(obstacle);
      obstacle.cauchyFullWall = true;
      game.obstacles.push(obstacle);
      boss.cauchyDomainObstacleIds.push(obstacle.id);
    }
  }

  function enterGaussDomain(boss, core) {
    boss.gaussZones = [];
    boss.gaussZoneBonus = 0;
    boss.gaussNextZoneCount = gaussZoneResetCount;
    const hpRatio = clamp((core.hp || 0) / Math.max(1, core.maxHp || 1), 0.001, 1);
    const restoreRatio = Math.max(0.25, Math.ceil(hpRatio * 4) / 4);
    boss.cores.forEach((item) => {
      if (item.hp > 0) {
        item.invisibleTimer = Math.max(item.invisibleTimer || 0, bossCoreInvisibleDuration);
      }
    });
    const others = boss.cores.filter((item) => item !== core && item.hp > 0);
    others.forEach((item) => {
      item.hp = item.maxHp * restoreRatio;
      const bonus = bossShieldForCore(item.id, boss.direct);
      item.domainShieldBonus = (item.domainShieldBonus || 0) + bonus;
      item.shield = (item.shield || 0) + bonus;
      item.maxShield = (item.maxShield || 0) + bonus;
      item.domainDamageMultiplier = 1.5;
      item.overloadFlash = Math.max(item.overloadFlash || 0, bossDomainCycleSeconds);
    });
  }

  function enterDescartesDomain(boss) {
    clearBossProjections();
    boss.descartesQuadrant = bossPlayerQuadrant();
    boss.descartesQuadrantChanges = 0;
    boss.descartesQuadrantProjectionCount = 0;
  }

  function bossPlayerQuadrant() {
    const player = game.player;
    if (!player) return "";
    const midX = (arena.left + arena.right) / 2;
    const midY = (arena.top + arena.bottom) / 2;
    if (player.x < midX && player.y < midY) return "q1";
    if (player.x >= midX && player.y < midY) return "q2";
    if (player.x < midX && player.y >= midY) return "q3";
    return "q4";
  }

  function randomPointInBossQuadrant(quadrant) {
    const midX = (arena.left + arena.right) / 2;
    const midY = (arena.top + arena.bottom) / 2;
    const bounds = {
      q1: { left: arena.left, right: midX, top: arena.top, bottom: midY },
      q2: { left: midX, right: arena.right, top: arena.top, bottom: midY },
      q3: { left: arena.left, right: midX, top: midY, bottom: arena.bottom },
      q4: { left: midX, right: arena.right, top: midY, bottom: arena.bottom },
    }[quadrant] || { left: arena.left, right: arena.right, top: arena.top, bottom: arena.bottom };
    const padding = 42;
    return {
      x: bounds.left + padding + Math.random() * Math.max(1, bounds.right - bounds.left - padding * 2),
      y: bounds.top + padding + Math.random() * Math.max(1, bounds.bottom - bounds.top - padding * 2),
    };
  }

  function spawnBossProjectionsInQuadrant(quadrant, count, source = "descartes") {
    if (source === "descartes-quadrant") {
      const boss = game.boss;
      const spawned = boss?.descartesQuadrantProjectionCount || 0;
      if (boss) boss.descartesQuadrantProjectionCount = spawned + count;
    }
    for (let i = 0; i < count; i += 1) {
      const point = randomPointInBossQuadrant(quadrant);
      spawnBossProjection(point.x, point.y, source);
    }
  }

  function spawnDescartesExitProjections(boss) {
    const changes = Math.max(0, Math.min(4, boss.descartesQuadrantChanges || 0));
    const count = changes <= 0 ? 6 : Math.max(0, 8 - changes * 2);
    for (let i = 0; i < count; i += 1) {
      const point = randomArenaPoint(48);
      spawnBossProjection(point.x, point.y, "descartes-exit");
    }
  }

  function updateDescartesDomain(boss, dt) {
    const quadrant = bossPlayerQuadrant();
    if (!quadrant) return;
    if (boss.fullPowerCoreId === "descartes") {
      boss.descartesQuadrant = quadrant;
      return;
    }
    if (!boss.descartesQuadrant) {
      boss.descartesQuadrant = quadrant;
      return;
    }
    if (quadrant !== boss.descartesQuadrant) {
      const previousQuadrant = boss.descartesQuadrant;
      boss.descartesQuadrant = quadrant;
      boss.descartesQuadrantChanges = (boss.descartesQuadrantChanges || 0) + 1;
      spawnBossProjectionsInQuadrant(previousQuadrant, 2, "descartes-quadrant");
      return;
    }
  }

  function bossDomainDamageMultiplier() {
    return game.boss?.domainCoreId === "descartes" && bossPlayerQuadrant() === "q1" ? 0.5 : 1;
  }

  function bossDomainIncomingMultiplier() {
    return game.boss?.domainCoreId === "descartes" && bossPlayerQuadrant() === "q2" ? 2 : 1;
  }

  function bossDomainMoveMultiplier() {
    return game.boss?.domainCoreId === "descartes" && bossPlayerQuadrant() === "q3" ? 0.5 : 1;
  }

  function bossDomainAttackCooldownMultiplier() {
    return game.boss?.domainCoreId === "descartes" && bossPlayerQuadrant() === "q4" ? 2 : 1;
  }

  function spawnBossProjection(x, y, source = "descartes") {
    const point = arenaPoint(x, y, 34);
    const id = `boss-projection-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    game.enemies.push({
      id,
      bossProjection: true,
      source,
      kind: "geometry",
      pattern: "projection",
      mechanics: [],
      x: point.x,
      y: point.y,
      baseX: point.x,
      baseY: point.y,
      r: 15 * characterSizeScale,
      hp: bossProjectionHp,
      maxHp: bossProjectionHp,
      fireTimer: 0.55,
      fireEvery: 1.15,
      moveT: 0,
      moveAmp: 10 + Math.random() * 10,
      moveSpeed: 1.4 + Math.random() * 0.6,
      movePhase: Math.random() * Math.PI * 2,
      facingAngle: 0,
      backHitFlash: 0,
      shieldFlash: 0,
      healFlash: 0,
      color: colors.cyan,
      shortName: "影",
      defeated: false,
    });
  }

  function clearBossProjections() {
    const count = game.enemies.filter((enemy) => enemy.bossProjection).length;
    game.enemies = game.enemies.filter((enemy) => !enemy.bossProjection);
    return count;
  }

  function updateBossProjections(dt) {
    game.enemies.forEach((enemy) => {
      if (!enemy.bossProjection || enemy.defeated) return;
      enemy.moveT += dt;
      enemy.x = clamp(enemy.baseX + Math.cos(enemy.moveT * enemy.moveSpeed + enemy.movePhase) * enemy.moveAmp, arena.left + 24, arena.right - 24);
      enemy.y = clamp(enemy.baseY + Math.sin(enemy.moveT * enemy.moveSpeed * 1.3 + enemy.movePhase) * enemy.moveAmp * 0.62, arena.top + 24, arena.bottom - 24);
      enemy.fireTimer -= dt;
      enemy.facingAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
      if (enemy.fireTimer <= 0) {
        enemy.fireTimer = enemy.fireEvery;
        spawnEnemyShot(enemy.x, enemy.y, enemy.facingAngle, 132, 7, enemy.color, {
          pattern: "straight",
          r: 5,
          life: 3.5,
        });
      }
      applyPlayerDamageToCircle(enemy, "enemy");
      if (enemy.hp <= 0) {
        enemy.defeated = true;
        burst(enemy.x, enemy.y, enemy.color, 20);
      }
    });
    game.enemies = game.enemies.filter((enemy) => !enemy.bossProjection || !enemy.defeated);
  }

  function createGaussZones(core) {
    const boss = game.boss;
    if (!boss || core.hp <= 0) return;
    const baseCount = boss.fullPowerCoreId === "gauss"
      ? gaussZoneMaxCount
      : boss.gaussNextZoneCount || gaussZoneBaseCount;
    const count = Math.min(gaussZoneMaxCount, baseCount + Math.min(gaussZoneMaxCount - baseCount, boss.gaussZoneBonus || 0));
    boss.gaussZoneBonus = 0;
    boss.gaussNextZoneCount = 0;
    boss.gaussZones = Array.from({ length: count }, (_, index) => ({
      ...randomArenaPoint(58),
      r: 26,
      life: gaussZoneDuration,
      pulse: index * 0.65,
      fireTimer: 0.25 + index * 0.12,
      coreId: core.id,
    }));
  }

  function updateGaussZones(boss, dt) {
    if (!boss.gaussZones?.length) return;
    const core = bossCoreById("gauss");
    boss.gaussZones.forEach((zone) => {
      zone.life -= dt;
      zone.fireTimer -= dt;
      if (zone.fireTimer <= 0 && core && core.hp > 0) {
        zone.fireTimer = gaussZoneFireEvery;
        const aim = Math.atan2(game.player.y - zone.y, game.player.x - zone.x) + (Math.random() - 0.5) * 0.22;
        [0, 1, 2].forEach((slot) => {
          const offset = (Math.PI * 2 * slot) / 3;
          spawnEnemyShot(zone.x, zone.y, aim + offset, 118, bossAttackDamage(core, 8), core.color, {
            pattern: "curve",
            gaussZone: true,
            curveAmp: 48,
            curveFreq: 4.6,
            curvePhase: zone.pulse + slot * 1.15,
            side: slot % 2 ? 1 : -1,
            r: 5,
            life: 4.2,
          });
        });
      }
    });
    boss.gaussZones = boss.gaussZones.filter((zone) => zone.life > 0);
  }

  function updateBossObstacles(boss, dt) {
    if (!game.obstacles.length) return;
    if (boss.domainCoreId === "cauchy") {
      boss.cauchyHighlightTimer = Math.max(0, (boss.cauchyHighlightTimer || cauchyHighlightEvery) - dt);
      if (boss.cauchyHighlightTimer <= 0) {
        highlightRandomCauchyCandidate(boss);
        boss.cauchyHighlightTimer = cauchyHighlightEvery;
      }
    }
    game.obstacles.forEach((obstacle) => {
      if (!obstacle.cauchyDomain) return;
      obstacle.marked = true;
      obstacle.markTimer = 0;
      obstacle.maxMarkTimer = 1;
    });
  }

  function highlightRandomCauchyCandidate(boss) {
    const candidates = game.obstacles.filter((obstacle) => (
      !obstacle.broken &&
      !obstacle.cauchyDomain &&
      (boss.cauchyCandidateObstacleIds || []).includes(obstacle.id)
    ));
    if (!candidates.length) return;
    const obstacle = candidates[Math.floor(Math.random() * candidates.length)];
    decorateCauchyDomainWall(obstacle);
    boss.cauchyDomainObstacleIds.push(obstacle.id);
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
        boss.rotateTimer = boss.rotateCooldown;
        startBossDomain(boss, bossTopCore(boss));
        bossActiveCores(boss).forEach((core) => {
          core.fireTimer = Math.min(core.fireTimer, 0.24);
        });
      }
      return;
    }

    if (isBossIntroActive()) return;
    boss.rotateTimer -= dt;
    if (boss.rotateTimer <= 0) {
      endBossDomain(boss);
      boss.rotating = true;
      boss.rotateElapsed = 0;
      boss.rotateFrom = boss.angle;
      boss.rotateTo = boss.angle + (Math.PI * 2) / 3;
    }
  }

  function updateBossDeaths(boss) {
    boss.cores.forEach((core) => {
      if (core.hp <= 0 && !core.defeated) {
        core.hp = 0;
        core.defeated = true;
        core.collapseTimer = 0.8;
        const pos = corePosition(core);
        burst(pos.x, pos.y, core.color, 46);
        if (core.id === "cauchy") {
          boss.cauchyBombs = [];
        }
        if (core.id === "gauss") {
          boss.gaussZones = [];
          boss.gaussZoneBonus = 0;
        }
        if (boss.domainCoreId === "gauss" && core.id !== "gauss") {
          const gauss = bossCoreById("gauss");
          if (gauss && gauss.hp > 0) {
            gauss.hp = gauss.maxHp;
            gauss.healFlash = Math.max(gauss.healFlash || 0, 0.7);
            boss.gaussDomainKillHealCount = (boss.gaussDomainKillHealCount || 0) + 1;
            const gaussPos = corePosition(gauss);
            burst(gaussPos.x, gaussPos.y, gauss.color, 34);
          }
        }
      }
      if (core.collapseTimer) {
        core.collapseTimer = Math.max(0, core.collapseTimer - 0.016);
      }
    });

    const defeatedCount = boss.cores.filter((core) => core.defeated).length;
    if (defeatedCount !== boss.defeatedCount) {
      boss.defeatedCount = defeatedCount;
      boss.phaseName = defeatedCount === 0 ? (boss.direct ? "裸考高压" : "领域轮转") : defeatedCount === 1 ? "双核领域" : "末核领域";
      if (boss.domainCoreId && bossCoreById(boss.domainCoreId)?.hp <= 0) {
        endBossDomain(boss);
        startBossDomain(boss, bossTopCore(boss));
      }
    }
  }

  function bossAttackDamage(core, baseDamage) {
    return baseDamage * (core?.domainDamageMultiplier || 1) * (core?.fullPowerDamageMultiplier || 1);
  }

  function restoreCoreToQuarter(core, minimumRatio = 0.25) {
    if (!core || core.hp <= 0) return;
    const hpRatio = clamp((core.hp || 0) / Math.max(1, core.maxHp || 1), 0.001, 1);
    const restoreRatio = Math.max(minimumRatio, Math.ceil(hpRatio * 4) / 4);
    core.hp = core.maxHp * restoreRatio;
    core.healFlash = Math.max(core.healFlash || 0, 0.7);
  }

  function updateBossFullPower(boss, dt) {
    if (!boss) return;
    const alive = boss.cores.filter((core) => core.hp > 0);
    if (alive.length !== 1) return;
    const core = alive[0];
    if (boss.fullPowerCoreId !== core.id) {
      enterBossFullPower(boss, core);
    }
    if (core.id === "gauss") {
      updateGaussFullPower(boss, core, dt);
    } else if (core.id === "cauchy") {
      updateCauchyFullPower(boss, dt);
    } else if (core.id === "descartes") {
      updateDescartesFullPower(boss, dt);
    }
  }

  function enterBossFullPower(boss, core) {
    boss.fullPowerCoreId = core.id;
    boss.phaseName = "末核领域";
    core.enraged = true;
    core.fullPowerDamageMultiplier = core.id === "descartes" ? 1 : 1.5;
    core.overloadFlash = Math.max(core.overloadFlash || 0, bossDomainCycleSeconds);
    const pos = corePosition(core);
    burst(pos.x, pos.y, core.color, 54);

    if (core.id === "gauss") {
      restoreCoreToQuarter(core);
      core.maxShield = Math.max(core.maxShield || 0, bossShieldForCore("gauss", boss.direct));
      core.shield = core.maxShield;
      boss.gaussZones = [];
      boss.gaussNextZoneCount = gaussZoneMaxCount;
      boss.gaussZoneBonus = 0;
      boss.gaussFullPowerStealthTimer = gaussFullPowerStealthEvery;
    } else if (core.id === "cauchy") {
      explodeAllBossWallsAsCauchy(boss, cauchyExplosionBulletCount);
      generateCauchyFullPowerWalls(boss);
      boss.cauchyFullPowerTimer = cauchyFullPowerCycle;
    } else if (core.id === "descartes") {
      const cleared = clearBossProjections(true);
      if (cleared > 0) {
        core.hp = Math.min(core.maxHp, core.hp + cleared * 5);
        core.healFlash = Math.max(core.healFlash || 0, 0.7);
      }
      boss.descartesFullPowerTimer = descartesFullPowerSpawnEvery;
    }
  }

  function updateGaussFullPower(boss, core, dt) {
    boss.gaussFullPowerStealthTimer = Math.max(0, (boss.gaussFullPowerStealthTimer || gaussFullPowerStealthEvery) - dt);
    if (boss.gaussFullPowerStealthTimer <= 0 && (core.invisibleTimer || 0) <= 0) {
      core.invisibleTimer = gaussFullPowerStealthDuration;
      boss.gaussFullPowerStealthTimer = gaussFullPowerStealthEvery + gaussFullPowerStealthDuration;
      burst(corePosition(core).x, corePosition(core).y, core.color, 20);
    }
  }

  function updateCauchyFullPower(boss, dt) {
    boss.cauchyFullPowerTimer = Math.max(0, (boss.cauchyFullPowerTimer || cauchyFullPowerCycle) - dt);
    if (boss.cauchyFullPowerTimer > 0) return;
    explodeAllBossWallsAsCauchy(boss, cauchyExplosionBulletCount);
    generateCauchyFullPowerWalls(boss);
    boss.cauchyFullPowerTimer = cauchyFullPowerCycle;
  }

  function updateDescartesFullPower(boss, dt) {
    boss.descartesFullPowerTimer = Math.max(0, (boss.descartesFullPowerTimer || descartesFullPowerSpawnEvery) - dt);
    if (boss.descartesFullPowerTimer > 0) return;
    const point = randomArenaPoint(56);
    spawnBossProjection(point.x, point.y, "descartes-full");
    boss.descartesFullPowerTimer = descartesFullPowerSpawnEvery;
  }

  function bossPhaseMultiplier() {
    const boss = game.boss;
    if (!boss) return 1;
    if (boss.defeatedCount >= 2) return 0.78;
    if (boss.defeatedCount === 1) return 0.92;
    return 1;
  }

  function bossCoreInterval(core) {
    const interval = (core.baseFireEvery || core.fireEvery) * bossPhaseMultiplier() / Math.max(1, core.domainFireMultiplier || 1);
    return Math.max(0.62, interval);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  }

  function fireBossCore(core) {
    if (!isBossCoreFront(core)) return;
    const pos = corePosition(core);
    if (core.id === "cauchy") {
      fireCauchySquares(pos, core);
      return;
    }
    if (core.id === "descartes") {
      fireDescartesCross(pos, core);
      return;
    }
    createGaussZones(core);
  }

  function fireCauchySquares(pos, core) {
    const boss = game.boss;
    if (!boss) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 66;
    const target = arenaPoint(
      game.player.x + Math.cos(angle) * radius,
      game.player.y + Math.sin(angle) * radius,
      68
    );
    boss.cauchyBombs ||= [];
    boss.cauchyBombs.push({
      stage: "large",
      x: target.x,
      y: target.y,
      r: 58,
      timer: 0.68,
      maxTimer: 0.68,
      coreId: core.id,
      color: core.color,
      damage: bossAttackDamage(core, 13),
      bulletDamage: bossAttackDamage(core, 7),
      sourceX: pos.x,
      sourceY: pos.y,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function updateCauchyBombs(boss, dt) {
    if (!boss?.cauchyBombs?.length) return;
    const spawned = [];
    boss.cauchyBombs.forEach((bomb) => {
      bomb.timer -= dt;
      if (bomb.timer > 0) return;
      explodeCauchyBomb(bomb);
      if (bomb.stage === "large") {
        const base = Math.atan2(game.player.y - bomb.y, game.player.x - bomb.x) + Math.random() * 0.55;
        for (let i = 0; i < 5; i += 1) {
          const angle = base + (Math.PI * 2 * i) / 5;
          const point = arenaPoint(
            bomb.x + Math.cos(angle) * 72,
            bomb.y + Math.sin(angle) * 72,
            48
          );
          spawned.push({
            stage: "small",
            x: point.x,
            y: point.y,
            r: 28,
            timer: 0.48,
            maxTimer: 0.48,
            coreId: bomb.coreId,
            color: bomb.color,
            damage: Math.max(5, bomb.damage * 0.52),
            bulletDamage: bomb.bulletDamage,
            sourceX: bomb.x,
            sourceY: bomb.y,
            pulse: bomb.pulse + i,
          });
        }
      } else {
        fireCauchyBombRow(bomb);
      }
    });
    boss.cauchyBombs = [
      ...boss.cauchyBombs.filter((bomb) => bomb.timer > 0),
      ...spawned,
    ];
  }

  function explodeCauchyBomb(bomb) {
    burst(bomb.x, bomb.y, bomb.color || colors.chalk, bomb.stage === "large" ? 24 : 14);
    const player = game.player;
    if (player && player.invuln <= 0 && distance(player, bomb) <= player.r + bomb.r) {
      applyPlayerDamage(scaledIncomingDamage(bomb.damage || 8), bomb.color || colors.chalk);
      player.invuln = Math.max(player.invuln, bomb.stage === "large" ? 0.78 : 0.55);
    }
  }

  function fireCauchyBombRow(bomb) {
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < 3; i += 1) {
      const angle = baseAngle + (Math.PI * 2 * i) / 3 + (Math.random() - 0.5) * 0.32;
      spawnEnemyShot(
        bomb.x,
        bomb.y,
        angle,
        145 + Math.random() * 22,
        bomb.bulletDamage || 7,
        bomb.color || colors.chalk,
        {
          pattern: "straight",
          shape: "square",
          r: 7,
          life: 3.6,
          cauchyDot: true,
          cauchySlow: true,
          cauchyMarksWall: true,
        }
      );
    }
  }

  function fireDescartesCross(pos, core) {
    fireDescartesLaser(pos, core);
    if (game.boss?.fullPowerCoreId === "descartes") return;
    spawnBossProjection(
      clamp(game.player.x, arena.left + 46, arena.right - 46),
      clamp(game.player.y, arena.top + 46, arena.bottom - 46),
      "descartes-attack"
    );
  }

  function fireDescartesLaser(pos, core) {
    const snapX = clamp(game.player.x, arena.left + 76, arena.right - 76);
    const snapY = clamp(game.player.y, arena.top + 50, arena.bottom - 38);
    const damage = bossAttackDamage(core, 18);
    spawnEnemyLaser({
      orientation: "vertical",
      x: snapX,
      y: 0,
      warningTime: 0.62,
      activeTime: 0.38,
      width: 22,
      damage,
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
      damage,
      color: core.color,
      sourceX: pos.x,
      sourceY: pos.y,
    });
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
    game.enemyShots.forEach(splitEnemyShotAtWall);
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
        weaponId: shot.weaponId,
        weaponName: shot.weaponName,
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

  function enemyShotHitArenaWall(shot) {
    if (!shot.wallSplit || shot.wallSplitDone || (shot.wallSplitDepth || 0) <= 0 || shot.age < 0.12) return null;
    if (shot.x <= arena.left + shot.r) return 0;
    if (shot.x >= arena.right - shot.r) return Math.PI;
    if (shot.y <= arena.top + shot.r) return Math.PI / 2;
    if (shot.y >= arena.bottom - shot.r) return -Math.PI / 2;
    return null;
  }

  function splitEnemyShotAtWall(shot) {
    const normalAngle = enemyShotHitArenaWall(shot);
    if (normalAngle == null) return;
    shot.wallSplitDone = true;
    shot.life = 0;
    const x = clamp(shot.x, arena.left + shot.r + 1, arena.right - shot.r - 1);
    const y = clamp(shot.y, arena.top + shot.r + 1, arena.bottom - shot.r - 1);
    [-0.42, 0, 0.42].forEach((offset, index) => {
      spawnEnemyShot(x, y, normalAngle + offset, 132 + index * 8, (shot.damage || 6) * 0.72, shot.color || colors.warning, {
        r: Math.max(3, (shot.r || 4) * 0.72),
        life: 2.4,
        ownerId: shot.ownerId,
        pattern: index === 1 ? "straight" : "curve",
        curveAmp: index === 1 ? 0 : 18,
        curveFreq: 4.5,
        curvePhase: index,
      });
    });
    burst(x, y, shot.color || colors.warning, 8);
  }

  function splitEnemyShotFromObstacle(shot, obstacle) {
    if (!shot.wallSplit || shot.wallSplitDone || (shot.wallSplitDepth || 0) <= 0) return;
    shot.wallSplitDone = true;
    const center = obstacleCenter(obstacle);
    const normalAngle = Math.atan2(shot.y - center.y, shot.x - center.x);
    [-0.48, 0, 0.48].forEach((offset, index) => {
      spawnEnemyShot(shot.x, shot.y, normalAngle + offset, 124 + index * 9, (shot.damage || 6) * 0.72, shot.color || colors.warning, {
        r: Math.max(3, (shot.r || 4) * 0.72),
        life: 2.3,
        ownerId: shot.ownerId,
        pattern: index === 1 ? "straight" : "curve",
        curveAmp: index === 1 ? 0 : 18,
        curveFreq: 4.5,
        curvePhase: index,
      });
    });
    burst(shot.x, shot.y, shot.color || colors.warning, 8);
  }

  function blockShotWithObstacles(shot) {
    if (shot.life <= 0) return;
    if (shot.ignoresObstacles) return;
    const obstacle = game.obstacles.find((item) => !item.broken && circleObstacleCollision(shot, item, shot.r || 4));
    if (!obstacle) return;
    if (!shot.weaponId && obstacle.cauchyDomain) {
      return;
    }
    if (shot.weaponId && obstacle.cauchyDomain) {
      reflectPlayerShotFromCauchyWall(shot, obstacle);
      shot.life = 0;
      return;
    }
    if (shot.cauchyMarksWall) {
      decorateCauchyDomainWall(obstacle);
    }
    if (shot.archimedesMark) {
      markArchimedesDashTarget(shot, obstacle);
    }
    if (shot.wallSplit && (shot.wallSplitDepth || 0) > 0 && !shot.wallSplitDone) {
      splitEnemyShotFromObstacle(shot, obstacle);
    }
    shot.life = 0;
    burst(shot.x, shot.y, colors.muted, shot.shape === "beam" ? 7 : 4);
  }

  function reflectPlayerShotFromCauchyWall(shot, obstacle) {
    const center = obstacleCenter(obstacle);
    const angle = Math.atan2(game.player.y - shot.y, game.player.x - shot.x);
    spawnEnemyShot(shot.x, shot.y, angle, 156, Math.max(7, (shot.damage || 8) * 0.45), colors.chalk, {
      pattern: "curve",
      shape: shot.shape === "beam" ? "square" : shot.shape || "circle",
      curveAmp: 30,
      curveFreq: 4.4,
      curvePhase: Math.random() * Math.PI,
      side: Math.random() > 0.5 ? 1 : -1,
      r: Math.max(5, shot.r || 5),
      life: 3.2,
    });
    obstacle.marked = true;
    burst(center.x, center.y, colors.chalk, 10);
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
        onMonsterDamaged(enemy, splashDamage);
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
        if (distance(pos, target) > radius + bossCoreHitRadius) return;
        damageBossCore(core, scaledBossDamage(splashDamage, shot.kind, core), shot.weaponId, shot.weaponName);
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
        let absorbed = false;
        if (type === "enemy") {
          const hit = monsterHitDamage(shot.damage, target, { x: shot.prevX ?? shot.x, y: shot.prevY ?? shot.y });
          damage = hit.amount;
          backHit = hit.backHit;
          absorbed = hit.absorbed;
        }
        if (coreRef) {
          damageBossCore(coreRef, damage, shot.weaponId, shot.weaponName);
          burst(target.x, target.y, coreRef.shield > 0 ? colors.paper : coreRef.color, shot.blastRadius ? 16 : 4);
        } else {
          target.hp -= damage;
          onMonsterDamaged(target, damage);
          target.backHitFlash = backHit ? 0.28 : target.backHitFlash || 0;
          burst(target.x, target.y, absorbed ? colors.paper : backHit ? colors.paper : target.color || colors.chalk, absorbed ? 12 : backHit ? 14 : shot.blastRadius ? 16 : 4);
        }
        if (!absorbed) {
          applyShotExplosion(shot, target, type, coreRef);
        }
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
        let absorbed = false;
        if (type === "enemy") {
          const hit = monsterHitDamage(slash.damage, target, { x: slash.originX ?? slash.x, y: slash.originY ?? slash.y });
          damage = hit.amount;
          backHit = hit.backHit;
          absorbed = hit.absorbed;
        }
        if (coreRef) {
          damageBossCore(coreRef, damage, slash.weaponId, slash.weaponName);
          burst(target.x, target.y, coreRef.shield > 0 ? colors.paper : coreRef.color, 5);
        } else {
          target.hp -= damage;
          onMonsterDamaged(target, damage);
          target.backHitFlash = backHit ? 0.28 : target.backHitFlash || 0;
          burst(target.x, target.y, absorbed ? colors.paper : backHit ? colors.paper : target.color || colors.chalk, absorbed ? 12 : backHit ? 14 : 5);
        }
        slash.hitIds.add(targetId);
      }
    });
  }

  function damageBossCore(core, amount, sourceWeaponId = "", sourceWeaponName = "") {
    const boss = game.boss;
    if (!boss || !core || core.hp <= 0) return 0;
    let remaining = Math.max(0, Number(amount || 0));
    let absorbed = 0;
    if (remaining > 0 && (core.invisibleTimer || 0) > 0) {
      core.revealTimer = Math.max(core.revealTimer || 0, bossCoreRevealDuration);
      core.hitFlash = Math.max(core.hitFlash || 0, 0.18);
      const pos = corePosition(core);
      burst(pos.x, pos.y, core.color || colors.paper, 10);
    }
    if ((core.shield || 0) > 0) {
      if (!bossShieldAllowsWeapon(core, sourceWeaponId)) {
        core.guardFlash = 0.28;
        return 0;
      }
      absorbed = Math.min(core.shield, remaining);
      core.shield = Math.max(0, core.shield - absorbed);
      remaining -= absorbed;
    }
    if (isBossCoreInDomain(core, boss)) {
      core.guardFlash = 0.28;
      if (absorbed > 0) {
        recordBossWeaponDamage(sourceWeaponId, sourceWeaponName, absorbed);
        core.hitFlash = 0.18;
      }
      return absorbed;
    }
    const hpDamage = remaining > 0 ? Math.min(Math.max(0, core.hp), remaining) : 0;
    if (remaining > 0) {
      core.hp -= remaining;
    }
    recordBossWeaponDamage(sourceWeaponId, sourceWeaponName, absorbed + hpDamage);
    core.hitFlash = 0.18;
    return absorbed + hpDamage;
  }

  function scaledBossDamage(baseDamage, weaponKind, coreRef) {
    if (!coreRef) return baseDamage;
    let damage = baseDamage * bossKindMultiplier(weaponKind, coreRef);
    const boss = game.boss;
    damage *= bossDomainDamageMultiplier();
    return damage;
  }

  function bossKindMultiplier(weaponKind, coreRef) {
    if (!coreRef) return 1;
    return weaponKind === "sword" || weaponKind === coreRef.kind ? 1.25 : 0.8;
  }

  function bossShieldAllowsWeapon(core, sourceWeaponId) {
    const weapon = weapons[sourceWeaponId];
    return sourceWeaponId === "sword" || weapon?.kind === core.kind;
  }

  function triggerGaussHitRetaliation(core) {
    const boss = game.boss;
    if (!boss) return;
    const baseCount = boss.fullPowerCoreId === "gauss" ? gaussZoneMaxCount : boss.gaussNextZoneCount || gaussZoneBaseCount;
    boss.gaussZoneBonus = Math.min(Math.max(0, gaussZoneMaxCount - baseCount), (boss.gaussZoneBonus || 0) + 1);
    if (!core || core.hp <= 0) return;
    const pos = corePosition(core);
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      spawnEnemyShot(pos.x, pos.y, (Math.PI * 2 * i) / count, 122, bossAttackDamage(core, 8), core.color, {
        pattern: "straight",
        r: 5,
        life: 3.4,
      });
    }
    burst(pos.x, pos.y, core.color, 22);
  }

  function applyPlayerDamage(amount, color) {
    const player = game.player;
    if (!player || amount <= 0) return 0;
    if (game.developerMode) {
      player.invuln = Math.max(player.invuln || 0, 0.2);
      return 0;
    }

    let remaining = amount * incomingDamageMultiplier(player);
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
    return game.activeRoom === "boss" ? value * bossDamageScale * bossDomainIncomingMultiplier() : value;
  }

  function checkPlayerHits() {
    const player = game.player;
    if (player.invuln > 0) return;

    for (const shot of game.enemyShots) {
      if (shot.harmless) continue;
      if (distance(player, shot) <= player.r + shot.r) {
        shot.life = 0;
        onEnemyAttackHitPlayer(shot);
        applyPlayerDamage(scaledIncomingDamage(shot.damage || baseStats.enemyBulletDamage || 10), shot.color || colors.danger);
        player.invuln = 0.65;
        break;
      }
    }

    if (player.invuln > 0) return;
    for (const laser of game.enemyLasers) {
      if (!isLaserActive(laser) || laser.hit) continue;
      if (laserHitsPlayer(laser, player)) {
        laser.hit = true;
        onEnemyAttackHitPlayer(laser);
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
      ownerId: options.ownerId || "",
      weaponSeal: Boolean(options.weaponSeal),
      weaponSealSourceId: options.weaponSealSourceId || "",
      cauchyDot: Boolean(options.cauchyDot),
      cauchySlow: Boolean(options.cauchySlow),
      cauchyMarksWall: Boolean(options.cauchyMarksWall),
      gaussZone: Boolean(options.gaussZone),
      archimedesMark: Boolean(options.archimedesMark),
      harmless: Boolean(options.harmless),
      ignoresObstacles: Boolean(options.ignoresObstacles),
      wallSplit: Boolean(options.wallSplit),
      wallSplitDepth: options.wallSplitDepth || 0,
      armTime: options.armTime || 0,
      burstCount: options.burstCount || 0,
      burstSpeed: options.burstSpeed || 0,
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
      angle: options.angle || 0,
      warningTime: options.warningTime ?? 0.6,
      activeTime: options.activeTime ?? 0.35,
      width: options.width ?? 20,
      damage: options.damage ?? 18,
      color: options.color || colors.cyan,
      sourceX: options.sourceX ?? options.x ?? 0,
      sourceY: options.sourceY ?? options.y ?? 0,
      ownerId: options.ownerId || "",
      weaponSeal: Boolean(options.weaponSeal),
      deathBeam: Boolean(options.deathBeam),
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

  function drawMonsterMechanicFloor() {
    if (!game.enemies.length) return;
    const hasHalfField = game.enemies.some((enemy) => hasEnemyMechanic(enemy, "gaussHalfField"));
    const hasQuadrants = game.enemies.some((enemy) => hasEnemyMechanic(enemy, "quadrantBlink"));
    if (hasHalfField) {
      ctx.save();
      ctx.fillStyle = "rgba(231,111,97,0.06)";
      ctx.fillRect(arena.left, arena.top, arena.width, monsterMidY() - arena.top);
      ctx.fillStyle = "rgba(143,209,158,0.052)";
      ctx.fillRect(arena.left, monsterMidY(), arena.width, arena.bottom - monsterMidY());
      ctx.strokeStyle = "rgba(244,240,230,0.14)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(arena.left + 10, monsterMidY());
      ctx.lineTo(arena.right - 10, monsterMidY());
      ctx.stroke();
      ctx.restore();
    }
    if (hasQuadrants) {
      ctx.save();
      ctx.strokeStyle = "rgba(102,207,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 9]);
      ctx.beginPath();
      ctx.moveTo(monsterMidX(), arena.top + 10);
      ctx.lineTo(monsterMidX(), arena.bottom - 10);
      ctx.moveTo(arena.left + 10, monsterMidY());
      ctx.lineTo(arena.right - 10, monsterMidY());
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemyTelegraphs(enemy) {
    if (enemy.quadrantWarnTimer > 0) {
      const progress = 1 - clamp(enemy.quadrantWarnTimer / Math.max(0.01, enemy.quadrantWarnMax || 0.58), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + progress * 0.35;
      ctx.strokeStyle = enemy.color || colors.cyan;
      ctx.lineWidth = 2 + progress * 3;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.arc(enemy.quadrantTargetX, enemy.quadrantTargetY, 24 + progress * 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.dashWarnTimer > 0) {
      const progress = 1 - clamp(enemy.dashWarnTimer / Math.max(0.01, enemy.dashWarnMax || 0.58), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + progress * 0.35;
      ctx.strokeStyle = enemy.color || colors.cyan;
      ctx.lineWidth = 2 + progress * 2;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.dashTargetX || enemy.x, enemy.dashTargetY || enemy.y);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.lhopitalSlashWarnTimer || 0) > 0) {
      const progress = 1 - clamp(enemy.lhopitalSlashWarnTimer / Math.max(0.01, enemy.lhopitalSlashWarnMax || 0.18), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.28 + progress * 0.34;
      ctx.strokeStyle = enemy.color || colors.paper;
      ctx.lineWidth = 2 + progress * 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.lhopitalSlashTargetX || enemy.x, enemy.lhopitalSlashTargetY || enemy.y);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.archimedesDashWarnTimer || 0) > 0) {
      const progress = 1 - clamp(enemy.archimedesDashWarnTimer / Math.max(0.01, enemy.archimedesDashWarnMax || archimedesDashWarning), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.2 + progress * 0.38;
      ctx.strokeStyle = enemy.color || colors.cyan;
      ctx.lineWidth = 2 + progress * 2.5;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.archimedesDashTargetX || enemy.x, enemy.archimedesDashTargetY || enemy.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(enemy.archimedesDashTargetX || enemy.x, enemy.archimedesDashTargetY || enemy.y, 18 + progress * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.taylorDashWarnTimer || 0) > 0) {
      const progress = 1 - clamp(enemy.taylorDashWarnTimer / Math.max(0.01, enemy.taylorDashWarnMax || 0.26), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.26 + progress * 0.36;
      ctx.strokeStyle = enemy.color || colors.chalk;
      ctx.lineWidth = 2 + progress * 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.taylorDashTargetX || enemy.x, enemy.taylorDashTargetY || enemy.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(enemy.taylorDashTargetX || enemy.x, enemy.taylorDashTargetY || enemy.y, 18 + progress * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.jacobiBlinkWarnTimer || 0) > 0 && enemy.jacobiBlinkTarget) {
      const progress = 1 - clamp(enemy.jacobiBlinkWarnTimer / Math.max(0.01, enemy.jacobiBlinkWarnMax || 0.46), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.24 + progress * 0.34;
      ctx.strokeStyle = enemy.color || colors.warning;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(enemy.jacobiBlinkTarget.x, enemy.jacobiBlinkTarget.y, 22 + progress * 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.jordanSlashWarnTimer || 0) > 0 || (enemy.jordanSlashActiveTimer || 0) > 0) {
      const active = (enemy.jordanSlashActiveTimer || 0) > 0;
      const progress = active
        ? 1
        : 1 - clamp(enemy.jordanSlashWarnTimer / Math.max(0.01, enemy.jordanSlashWarnMax || jordanSlashWarnDuration), 0, 1);
      const radius = enemy.jordanSlashRadius || jordanDomainRadius * jordanSlashRadiusScale;
      const angle = enemy.jordanSlashAngle || 0;
      ctx.save();
      ctx.globalAlpha = active ? 0.34 : 0.12 + progress * 0.28;
      ctx.fillStyle = colors.warning;
      ctx.strokeStyle = enemy.color || colors.warning;
      ctx.lineWidth = active ? 4 : 2 + progress * 2;
      ctx.setLineDash(active ? [] : [9, 6]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.arc(enemy.x, enemy.y, radius, angle - Math.PI / 2, angle + Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawMonsterEnemy(enemy) {
    drawEnemyTelegraphs(enemy);
    if (enemy.jordanDomainActive) {
      ctx.save();
      ctx.globalAlpha = 0.13 + Math.sin((enemy.moveT || 0) * 3) * 0.025;
      ctx.fillStyle = colors.warning;
      circle(enemy.x, enemy.y, jordanDomainRadius);
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = colors.warning;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, jordanDomainRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.taylorRestTimer || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin((enemy.moveT || 0) * 9) * 0.04;
      ctx.strokeStyle = colors.paper;
      ctx.lineWidth = Math.max(1, 3 * characterSizeScale);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 22 * characterSizeScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.lhopitalInvincibleTimer || 0) > 0 || (enemy.lhopitalRestTimer || 0) > 0 || (enemy.jordanTransitionTimer || 0) > 0 || (enemy.shieldFlash || 0) > 0) {
      const timer = Math.max(enemy.lhopitalInvincibleTimer || 0, enemy.lhopitalRestTimer || 0, enemy.jordanTransitionTimer || 0, enemy.shieldFlash || 0);
      const shieldAlpha = Math.max(0.18, clamp(timer / Math.max(monsterShieldDuration, 1.05), 0, 1) * 0.42);
      ctx.save();
      ctx.globalAlpha = shieldAlpha;
      ctx.strokeStyle = colors.paper;
      ctx.lineWidth = Math.max(1, 3 * characterSizeScale);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 16 * characterSizeScale + Math.sin((enemy.moveT || 0) * 12) * 2 * characterSizeScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((enemy.healFlash || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(enemy.healFlash / 0.55, 0, 1) * 0.32;
      ctx.fillStyle = colors.mint;
      circle(enemy.x, enemy.y, enemy.r + 22 * characterSizeScale);
      ctx.restore();
    }
    drawHealthBar(enemy.x - 38 * characterSizeScale, enemy.y - 44 * characterSizeScale, 76 * characterSizeScale, Math.max(3, 7 * characterSizeScale), enemy.hp / enemy.maxHp, enemy.color);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    circle(enemy.x, enemy.y, enemy.r + 10 * characterSizeScale);
    ctx.fillStyle = enemy.color;
    circle(enemy.x, enemy.y, enemy.r);
    drawEnemyFacing(enemy);
    ctx.fillStyle = "#101514";
    ctx.font = `bold ${Math.max(9, 18 * characterSizeScale)}px Microsoft YaHei, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(enemy.shortName || "?", enemy.x, enemy.y + 6 * characterSizeScale);
  }

  function drawMonsterRoom() {
    drawMonsterMechanicFloor();
    game.enemies.forEach(drawMonsterEnemy);
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
      const cauchyMarked = Boolean(obstacle.cauchyDomain);
      const markProgress = marked ? 1 - clamp((obstacle.markTimer || 0) / (obstacle.maxMarkTimer || 1), 0, 1) : 0;
      const markColor = cauchyMarked ? "143, 209, 158" : "240, 195, 93";
      ctx.fillStyle = marked ? (cauchyMarked ? "rgba(22, 46, 33, 0.98)" : "rgba(50, 38, 24, 0.98)") : "rgba(36, 40, 40, 0.96)";
      ctx.strokeStyle = marked ? `rgba(${markColor}, ${0.48 + markProgress * 0.42})` : "rgba(244, 240, 230, 0.24)";
      ctx.lineWidth = 2;
      ctx.shadowColor = marked ? (cauchyMarked ? colors.chalk : colors.warning) : "transparent";
      ctx.shadowBlur = marked ? 12 + markProgress * 12 : 0;
      drawObstacleShape(obstacle, true, markProgress);
      ctx.shadowBlur = 0;
      if (obstacle.shape === "rect") {
        ctx.fillStyle = "rgba(244, 240, 230, 0.08)";
        ctx.fillRect(obstacle.x + 6, obstacle.y + 5, Math.max(0, obstacle.w - 12), 3);
      }
      if (marked && obstacle.shape === "rect") {
        ctx.fillStyle = `rgba(${markColor}, ${0.14 + markProgress * 0.16})`;
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
    if (obstacle.shape === "line" || obstacle.shape === "curve" || obstacle.shape === "corner") {
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

    if (obstacle.shape === "brokenLine") {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(5, obstacle.thickness || 9);
      ctx.beginPath();
      (obstacle.segments || []).forEach((segment) => {
        segment.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
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
    const weakX = enemy.x + Math.cos(backAngle) * (enemy.r + 3 * characterSizeScale);
    const weakY = enemy.y + Math.sin(backAngle) * (enemy.r + 3 * characterSizeScale);
    const flash = clamp((enemy.backHitFlash || 0) / 0.28, 0, 1);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(16,21,20,0.72)";
    ctx.beginPath();
    ctx.moveTo(enemy.r + 7 * characterSizeScale, 0);
    ctx.lineTo(enemy.r - 4 * characterSizeScale, -5 * characterSizeScale);
    ctx.lineTo(enemy.r - 4 * characterSizeScale, 5 * characterSizeScale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.62 + flash * 0.38;
    ctx.strokeStyle = flash > 0 ? colors.paper : "rgba(244,240,230,0.72)";
    ctx.fillStyle = flash > 0 ? "rgba(244,240,230,0.28)" : "rgba(21,23,24,0.38)";
    ctx.lineWidth = Math.max(1, (2 + flash * 2) * characterSizeScale);
    ctx.beginPath();
    ctx.arc(weakX, weakY, (7 + flash * 4) * characterSizeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBossRoom() {
    const boss = game.boss;
    if (!boss) return;
    drawBossDomainField(boss);
    drawBossBombs(boss);

    const introActive = isBossIntroActive();
    const visibleAliveCores = boss.cores.filter((core) => core.hp > 0 && (introActive || !isBossCoreHidden(core)));
    if (visibleAliveCores.length > 0) {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.rotate(boss.angle * 0.35);
      ctx.strokeStyle = boss.rotating ? "rgba(240,195,93,0.44)" : "rgba(255,255,255,0.14)";
      ctx.lineWidth = Math.max(1, (boss.rotating ? 3 : 2) * bossSizeScale);
      ctx.beginPath();
      ctx.arc(0, 0, 44 * bossSizeScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(244,240,230,0.06)";
      circle(0, 0, 30 * bossSizeScale);
      ctx.restore();
    }

    const positions = visibleAliveCores.map(corePosition);
    if (positions.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = boss.rotating ? "rgba(240,195,93,0.34)" : "rgba(255,255,255,0.16)";
      ctx.lineWidth = Math.max(1, (boss.rotating ? 3 : 2) * bossSizeScale);
      positions.forEach((pos, index) => {
        if (index === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      if (positions.length > 2) ctx.closePath();
      ctx.stroke();
    }

    const frontIds = new Set(bossFrontCoreIds(boss));
    boss.cores.forEach((core, index) => {
      const pos = corePosition(core);
      const alive = core.hp > 0;
      const front = alive && frontIds.has(core.id);
      const invulnerable = alive && !front;
      const hidden = alive && isBossCoreHidden(core);
      const revealed = alive && isBossCoreRevealed(core);
      if (hidden && !introActive) return;
      const introAlpha = bossIntroCoreAlpha(index);
      const overload = front && alive && ((core.domainFireMultiplier || 1) > 1 || (core.domainDamageMultiplier || 1) > 1);
      const tell = front && alive && !boss.rotating && (core.fireTimer || 0) > 0 && (core.fireTimer || 0) < 0.46;
      const flash = clamp((core.hitFlash || 0) / 0.18, 0, 1);
      const guardFlash = clamp((core.guardFlash || 0) / 0.28, 0, 1);
      const overloadFlash = clamp((core.overloadFlash || 0) / bossDomainCycleSeconds, 0, 1);
      const pulse = 1 + Math.sin(performance.now() / (overload ? 92 : 180) + core.offset) * (overload ? 0.09 : 0.05);
      ctx.save();
      ctx.globalAlpha = alive ? introAlpha * (invulnerable ? 0.52 : 1) : 0.24;
      ctx.shadowColor = revealed ? colors.paper : invulnerable ? colors.paper : overload ? colors.warning : core.enraged ? colors.danger : core.color;
      ctx.shadowBlur = alive ? ((invulnerable ? guardFlash * 18 : overload ? 30 : core.enraged ? 24 : 10) + flash * 16) * bossSizeScale : 0;
      ctx.fillStyle = invulnerable ? "rgba(244,240,230,0.045)" : overload ? "rgba(240,195,93,0.16)" : core.enraged ? "rgba(231,111,97,0.18)" : "rgba(255,255,255,0.08)";
      circle(pos.x, pos.y, ((overload ? 43 : core.enraged ? 40 : 34) * pulse + flash * 3) * bossSizeScale);
      ctx.shadowBlur = 0;
      drawCoreGlyph(core, pos);
      ctx.fillStyle = invulnerable ? "rgba(244,240,230,0.45)" : core.color;
      circle(pos.x, pos.y, (core.enraged ? 27 : 25) * pulse * bossSizeScale);
      ctx.fillStyle = "#111";
      ctx.font = `bold ${Math.max(8, 16 * bossSizeScale)}px Microsoft YaHei, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(core.symbol || core.name.slice(0, 2), pos.x, pos.y + 5 * bossSizeScale);
      drawHealthBar(pos.x - 42 * bossSizeScale, pos.y - 52 * bossSizeScale, 84 * bossSizeScale, Math.max(3, 7 * bossSizeScale), Math.max(0, core.hp / core.maxHp), core.color);
      if ((core.maxShield || 0) > 0) {
        drawHealthBar(pos.x - 42 * bossSizeScale, pos.y - 42 * bossSizeScale, 84 * bossSizeScale, Math.max(2, 4 * bossSizeScale), Math.max(0, (core.shield || 0) / core.maxShield), colors.cyan);
      }
      if (invulnerable) {
        ctx.strokeStyle = `rgba(244,240,230,${0.42 + guardFlash * 0.32})`;
        ctx.lineWidth = Math.max(1, (2 + guardFlash * 2) * bossSizeScale);
        ctx.setLineDash([9, 7]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (37 + Math.sin(performance.now() / 120) * 2 + guardFlash * 5) * bossSizeScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (overload) {
        ctx.strokeStyle = `rgba(244,240,230,${0.62 + overloadFlash * 0.28})`;
        ctx.lineWidth = Math.max(1, 3 * bossSizeScale);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (48 + Math.sin(performance.now() / 55) * 4) * bossSizeScale, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (tell) {
        ctx.strokeStyle = `rgba(255,255,255,${0.22 + Math.sin(performance.now() / 45) * 0.08})`;
        ctx.lineWidth = Math.max(1, 1.5 * bossSizeScale);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (31 + Math.max(0, 0.46 - core.fireTimer) * 30) * bossSizeScale, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (core.enraged) {
        ctx.strokeStyle = colors.danger;
        ctx.lineWidth = Math.max(1, 2 * bossSizeScale);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (33 + Math.sin(performance.now() / 90) * 3) * bossSizeScale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
    game.enemies.filter((enemy) => enemy.bossProjection).forEach(drawMonsterEnemy);

    ctx.textAlign = "start";
  }

  function drawBossBombs(boss) {
    if (!boss?.cauchyBombs?.length) return;
    ctx.save();
    boss.cauchyBombs.forEach((bomb) => {
      const progress = 1 - clamp((bomb.timer || 0) / Math.max(0.001, bomb.maxTimer || 1), 0, 1);
      const alpha = bomb.stage === "large" ? 0.2 : 0.16;
      const lineAlpha = bomb.stage === "large" ? 0.24 : 0.16;
      ctx.strokeStyle = `rgba(143, 209, 158, ${0.34 + progress * 0.38})`;
      ctx.fillStyle = `rgba(143, 209, 158, ${alpha + progress * 0.1})`;
      ctx.lineWidth = bomb.stage === "large" ? 2.4 : 1.8;
      ctx.setLineDash(bomb.stage === "large" ? [8, 7] : [5, 6]);
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, bomb.r * (0.86 + progress * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (bomb.sourceX != null && bomb.sourceY != null) {
        ctx.globalAlpha = lineAlpha + progress * 0.22;
        ctx.beginPath();
        ctx.moveTo(bomb.sourceX, bomb.sourceY);
        ctx.lineTo(bomb.x, bomb.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
  }

  function drawBossDomainField(boss) {
    if (!boss?.domainCoreId) return;
    const core = bossCoreById(boss.domainCoreId);
    const color = core?.color || colors.paper;
    ctx.save();
    if (boss.domainCoreId === "descartes") {
      const midX = (arena.left + arena.right) / 2;
      const midY = (arena.top + arena.bottom) / 2;
      const zones = [
        { key: "q1", x: arena.left, y: arena.top, w: midX - arena.left, h: midY - arena.top },
        { key: "q2", x: midX, y: arena.top, w: arena.right - midX, h: midY - arena.top },
        { key: "q3", x: arena.left, y: midY, w: midX - arena.left, h: arena.bottom - midY },
        { key: "q4", x: midX, y: midY, w: arena.right - midX, h: arena.bottom - midY },
      ];
      zones.forEach((zone) => {
        const active = boss.descartesQuadrant === zone.key;
        ctx.fillStyle = active ? "rgba(102,207,255,0.075)" : "rgba(102,207,255,0.032)";
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeStyle = active ? "rgba(102,207,255,0.34)" : "rgba(102,207,255,0.15)";
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
      });
    } else if (boss.domainCoreId === "gauss") {
      (boss.gaussZones || []).forEach((zone) => {
        const alpha = clamp(zone.life / gaussZoneDuration, 0, 1);
        ctx.fillStyle = `rgba(240,195,93,${0.07 + alpha * 0.08})`;
        circle(zone.x, zone.y, zone.r + Math.sin(performance.now() / 120 + zone.pulse) * 3);
        ctx.strokeStyle = `rgba(240,195,93,${0.26 + alpha * 0.22})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    } else {
      ctx.fillStyle = "rgba(240,195,93,0.035)";
      ctx.fillRect(arena.left, arena.top, arena.width, arena.height);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(arena.left + 4, arena.top + 4, arena.width - 8, arena.height - 8);
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
    ctx.lineWidth = Math.max(1, 1.5 * bossSizeScale);
    ctx.globalAlpha *= 0.58;
    if (core.id === "descartes") {
      ctx.beginPath();
      ctx.moveTo(pos.x - 38 * bossSizeScale, pos.y);
      ctx.lineTo(pos.x + 38 * bossSizeScale, pos.y);
      ctx.moveTo(pos.x, pos.y - 38 * bossSizeScale);
      ctx.lineTo(pos.x, pos.y + 38 * bossSizeScale);
      ctx.stroke();
    } else if (core.id === "gauss") {
      for (let row = -1; row <= 1; row += 1) {
        for (let col = -1; col <= 1; col += 1) {
          ctx.strokeRect(pos.x + col * 17 * bossSizeScale - 5 * bossSizeScale, pos.y + row * 17 * bossSizeScale - 5 * bossSizeScale, 10 * bossSizeScale, 10 * bossSizeScale);
        }
      }
    } else {
      ctx.beginPath();
      for (let i = 0; i < 38; i += 1) {
        const t = i / 37;
        const x = pos.x - 38 * bossSizeScale + t * 76 * bossSizeScale;
        const y = pos.y + Math.sin(t * Math.PI * 2) * 15 * bossSizeScale;
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
      } else if (shot.shape === "triangle") {
        const size = shot.r * 2.65 * pulse;
        ctx.save();
        ctx.translate(shot.x, shot.y);
        ctx.rotate(shot.angle || 0);
        ctx.beginPath();
        ctx.moveTo(size * 0.62, 0);
        ctx.lineTo(-size * 0.42, -size * 0.5);
        ctx.lineTo(-size * 0.42, size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.42)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
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
        if (laser.orientation === "ray") {
          traceLaser(laser);
        } else {
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
      }
      ctx.restore();
    });
  }

  function traceLaser(laser) {
    if (laser.orientation === "ray") {
      const segment = laserSegment(laser);
      ctx.beginPath();
      ctx.moveTo(segment.ax, segment.ay);
      ctx.lineTo(segment.bx, segment.by);
      ctx.stroke();
      return;
    }
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
    if ((player.shield || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = colors.cyan;
      ctx.lineWidth = Math.max(1, 3 * characterSizeScale);
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 16 * characterSizeScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = player.invuln > 0 ? 0.62 : 1;
    ctx.fillStyle = "rgba(244,240,230,0.16)";
    circle(player.x, player.y, player.r + 9 * characterSizeScale);
    ctx.fillStyle = colors.paper;
    circle(player.x, player.y, player.r);
    ctx.fillStyle = colors.ink;
    ctx.font = `bold ${Math.max(9, 18 * characterSizeScale)}px Microsoft YaHei, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("学", player.x, player.y + 6 * characterSizeScale);
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
    const radius = bossCoreOrbitRadius;
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
      const sealText = (player.weaponSealTimer || 0) > 0
        ? player.weaponSealSourceId
          ? " | 非几何封锁：直到目标倒下"
          : ` | 非几何封锁${Math.ceil(player.weaponSealTimer)}s`
        : "";
      const developerText = game.developerMode ? " | DEV" : "";
      hud.hp.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}${shieldText}${sealText}${developerText}`;
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

  function buffInfoMarkup() {
    const player = game.player;
    const activeBuffs = player?.buffs?.filter((buff) => buffDetails[buff]) || [];
    if (!activeBuffs.length) {
      return `
        <p class="buff-empty">当前暂无增益。进入知识点房间或宝箱房后，这里会显示已获得增益的效果说明。</p>
      `;
    }

    const counts = activeBuffs.reduce((map, buff) => {
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
      <p>这里显示当前已获得增益的实际作用。</p>
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
    if (weapon.special === "shieldPulse") {
      const maxBonus = weapon.shieldValueMaxBonus ?? 2;
      return `护盾脉冲 / 半径 ${weapon.pulseRadius || 72} / 每 ${fixedNumber(weapon.shieldEvery, 1)}s 生成 ${geometryShieldValue({ ...weapon, level: 1 })}-${geometryShieldValue({ ...weapon, level: maxBonus + 1 })} 护盾`;
    }
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

  function weaponInfoPager(pageIndex, totalPages) {
    return `
      <div class="weapon-info-pager" aria-label="武器与增益分页">
        <button type="button" data-weapon-info-page="${Math.max(0, pageIndex - 1)}" ${pageIndex <= 0 ? "disabled" : ""}>上一页</button>
        <span>${pageIndex + 1} / ${totalPages}</span>
        <button type="button" data-weapon-info-page="${Math.min(totalPages - 1, pageIndex + 1)}" ${pageIndex >= totalPages - 1 ? "disabled" : ""}>下一页</button>
      </div>
    `;
  }

  function buffCatalogMarkup() {
    const cards = buffRewardIds.map((name) => {
      const detail = buffDetails[name] || {
        type: "增益",
        effect: "当前基础版暂未记录该增益的具体说明。",
        source: "房间奖励。",
      };
      return `
        <article class="buff-card">
          <header>
            <div>
              <strong>${escapeHtml(name)}</strong>
              <span>${escapeHtml(detail.type || "增益")}</span>
            </div>
          </header>
          <p>${escapeHtml(detail.effect || "获得一项战斗增益。")}</p>
          <small>${escapeHtml(detail.source || "房间奖励。")}</small>
        </article>
      `;
    }).join("");

    return `
      <p>以下为当前可获得的全部增益。宝箱房会在随机武器和随机增益中二选一，知识点教室则会随挑战人数给出可选增益。</p>
      <div class="buff-list buff-catalog">${cards}</div>
    `;
  }

  function weaponStatsMarkup() {
    const totalPages = 2;
    const pageIndex = clamp(weaponInfoPageIndex, 0, totalPages - 1);
    weaponInfoPageIndex = pageIndex;
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

    const weaponPage = `
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

    return `
      <div class="weapon-info-board">
        <div class="weapon-info-page-head">
          <span>武器与增益</span>
          <strong>${pageIndex === 0 ? "武器数据" : "增益简介"}</strong>
        </div>
        ${pageIndex === 0 ? weaponPage : buffCatalogMarkup()}
        ${weaponInfoPager(pageIndex, totalPages)}
      </div>
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

  function enemyCodexMarkup() {
    const sections = [
      {
        title: "普通投影",
        entries: [
          {
            name: "拉格朗日投影",
            meta: "微积分 / 八连弹与分裂",
            body: "每隔一段时间朝玩家方向打出八颗扇形弹，死亡后分裂成两个本体 2/5 血量的小投影。分裂体只发射两颗弹，但弹速更快、移动更随机。",
            tip: "击杀前先留出走位空间，避免被分裂体贴脸夹击。",
          },
          {
            name: "洛必达投影",
            meta: "微积分 / 剑盾循环",
            body: "开局 5 秒无敌，随后朝玩家方向连续挥剑三次并向前突进。挥剑后会休息举盾，休息期间受到伤害减少 75%；低血量时休息更短且多挥一次。",
            tip: "开场先拉开距离，等它挥剑结束后再看准举盾间隙输出。",
          },
          {
            name: "泰勒投影",
            meta: "微积分 / 三段冲刺",
            body: "平时不射击，会周期性预警后三段连续冲刺。冲刺命中会造成高伤害，冲刺后的短暂休息期受到伤害大幅降低。",
            tip: "看见预警后横向拉开，等休息期结束再集中火力。",
          },
          {
            name: "阿基米德投影",
            meta: "欧氏几何 / 三角标记冲刺",
            body: "向玩家发射高速三角弹，三角弹命中障碍物后生成标记点，随后预警并冲刺到标记位置。两次墙体冲刺后，下一次会直接预瞄玩家位置。",
            tip: "看到障碍物被标记后先离开路径，第三次冲刺尤其不要贪刀。",
          },
          {
            name: "笛卡尔投影",
            meta: "欧氏几何 / 坐标轴激光",
            body: "每次锁定玩家当前 x 坐标与 y 坐标，生成贯穿全图的十字激光。它会把地图划成四个象限，每隔 8 秒闪现到其他象限。",
            tip: "不要长时间站在横竖轴交点附近，换象限后尽快重新拉开角度。",
          },
          {
            name: "欧几里得投影",
            meta: "欧氏几何 / 双半圆冲刺",
            body: "每次攻击会进行两段方向相反的半圆冲刺。每段冲刺都会发射一圈 10 发弹，其中 3 发方形弹命中后会封锁非欧氏几何和圣剑之外的武器，直到欧几里得倒下。",
            tip: "被方形弹命中后先切回圣剑或几何武器，优先处理欧几里得解除封锁。",
          },
          {
            name: "雅可比投影",
            meta: "线性代数 / 连续齐射",
            body: "会发起四波五连弹齐射，并周期性闪现到玩家身后附近。闪现落点后的齐射伤害更高。",
            tip: "注意背后判定和落点预警，闪现后先躲第一轮再反打。",
          },
          {
            name: "若尔当投影",
            meta: "线性代数 / 领域压迫",
            body: "半血以上会发射碰到障碍物后分裂的环形弹。半血以下展开圆形安全领域，玩家在领域外每秒持续扣血，本体攻击改为前方半圈挥刀。",
            tip: "领域内保持近中距离绕圈，不要被迫退到场边。",
          },
          {
            name: "高斯投影",
            meta: "线性代数 / 上下半场",
            body: "会在上下半场切换。上半区时伤害翻倍、受到伤害减半，并且在上半区死亡会释放五道死亡激光；下半区会低血保护并缓慢回复。",
            tip: "尽量在下半区压血，确认走位安全后再完成击杀。",
          },
          {
            name: "Boss 投影",
            meta: `Boss 召唤物 / ${bossProjectionHp} 生命`,
            body: "由笛卡尔核心领域召唤，会小幅移动并朝玩家射击。每次切换象限会在旧象限生成两个投影，领域结束时会按切换次数额外召唤 6/4/2/0 个投影。",
            tip: "投影血量低，但会挤压走位；场上过多时优先清掉。",
          },
        ],
      },
      {
        title: "Boss 核心",
        entries: [
          {
            name: "三位一体",
            meta: "Boss 通用规则",
            body: "三核心沿三角轨迹移动并每 20 秒轮转。当前位于上方的核心进入领域，领域核心不攻击且生命无敌，但护盾仍可被对应武器或圣剑击破。",
            tip: "优先判断当前可伤害核心，再用克制或高命中武器输出。",
          },
          {
            name: "柯西核心",
            meta: "微积分 / 炸弹链与墙体领域",
            body: "普通攻击会在玩家附近标出大范围炸点，爆炸后分裂成五个小炸点，小炸点爆炸后朝随机方向发射三枚方块弹。领域中会生成或点亮柯西墙，玩家子弹会被领域墙反射，领域开始和结束都会引爆绿墙。",
            tip: "先离开圆形落点，再观察小炸点的排弹方向，不要贴着绿色领域墙输出。",
          },
          {
            name: "笛卡尔核心",
            meta: "欧氏几何 / 十字激光与象限领域",
            body: "普通攻击为十字激光并在交点生成投影。领域内按玩家所在象限改变规则：一象限玩家输出降低，二象限承伤提高，三象限移速降低，四象限武器冷却变长；换象限会在旧象限召唤两个投影。",
            tip: "尽量避免长期停在二、三、四象限的危险状态里。",
          },
          {
            name: "高斯核心",
            meta: "线性代数 / 随机点曲线弹",
            body: "普通攻击会生成多个随机区域，每个区域周期性发射三向曲线弹。高斯领域会让另外两个核心回升到当前血量阈值、加盾并强化伤害，所有核心短暂隐身；玩家被区域弹命中会提高下一轮区域数量，若其他核心在高斯领域中死亡，高斯会回满血。",
            tip: "高斯领域期间先保命和控场，不要急着击杀其他核心。",
          },
        ],
      },
    ];
    return `
      <div class="enemy-codex">
        ${sections.map((section) => `
          <section class="codex-section">
            <h3>${escapeHtml(section.title)}</h3>
            <div class="codex-grid">
              ${section.entries.map((entry) => `
                <article class="codex-card">
                  <header>
                    <strong>${escapeHtml(entry.name)}</strong>
                    <span>${escapeHtml(entry.meta)}</span>
                  </header>
                  <p>${escapeHtml(entry.body)}</p>
                  <small>${escapeHtml(entry.tip)}</small>
                </article>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    `;
  }

  function betaBossShopMarkup() {
    const shop = ensureBetaBossShopStock();
    const hp = Math.max(0, Math.ceil(game.player?.hp || 0));
    const credits = Math.max(0, Math.round(Number(game.credits || 0)));
    const refreshCost = Math.max(1, Math.round(Number(shop.refreshCost || 1)));
    const canBuy = hp > betaShopItemHpCost;
    const cards = shop.stock.map((item, index) => {
      const name = betaShopItemName(item);
      const weapon = item.type === "weapon" ? weapons[item.id] : null;
      const meta = item.type === "weapon"
        ? `${weaponKindLabel(weapon?.kind)} / ${weapon?.ranged ? "远程" : "近战"} / ${weaponDamageLabel(weapon)}`
        : `${buffDetails[item.id]?.type || "增益"} / ${buffBriefText(item.id)}`;
      const detail = item.type === "weapon"
        ? "加入背包；如果已拥有同类武器，则强化现有武器。"
        : (buffDetails[item.id]?.effect || "获得一项战斗增益。");
      return `
        <article class="beta-shop-card${item.purchased ? " purchased" : ""}">
          <header>
            <span>${item.type === "weapon" ? "武器" : "增益"}</span>
            <strong>${escapeHtml(name)}</strong>
          </header>
          <p>${escapeHtml(meta)}</p>
          <small>${escapeHtml(detail)}</small>
          <button type="button" data-beta-shop-buy="${index}" ${item.purchased || !canBuy ? "disabled" : ""}>
            ${item.purchased ? "已兑换" : `${betaShopItemHpCost} 生命兑换`}
          </button>
        </article>
      `;
    }).join("");
    return `
      <div class="beta-shop">
        <div class="beta-shop-status">
          <span>学分 <strong>${credits}</strong></span>
          <span>生命 <strong>${hp}</strong></span>
          <span>刷新 <strong>${refreshCost}</strong></span>
        </div>
        <p class="beta-shop-note">每件商品消耗 ${betaShopItemHpCost} 生命；刷新只消耗学分，价格从 1 学分开始逐次增加。进入商店时的房间回血已经结算，开始 Boss 战后不会再次回血。</p>
        <div class="beta-shop-grid">${cards}</div>
        <div class="beta-shop-actions">
          <button type="button" data-beta-shop-action="refresh" ${credits < refreshCost ? "disabled" : ""}>刷新商店（${refreshCost} 学分）</button>
          <button class="primary-action" type="button" data-beta-shop-action="start">开始 Boss 战</button>
        </div>
        <p class="beta-shop-message">${escapeHtml(shop.message || "可以直接开始 Boss 战，也可以用生命和学分做最后准备。")}</p>
      </div>
    `;
  }

  function developerMarkup() {
    const player = game.player;
    const status = game.developerMode
      ? "\u5df2\u5f00\u542f\uff1a\u672c\u5c40\u4e0d\u4f1a\u6263\u8840\uff0c\u4e14\u4e0d\u8bb0\u5165\u6392\u884c\u699c"
      : "\u5df2\u5173\u95ed";
    const weaponRows = Object.keys(weapons).map((id) => {
      const owned = player?.weapons?.find((weapon) => weapon.id === id);
      const label = owned ? displayWeaponName(owned) : weapons[id].name;
      const details = owned
        ? `Lv.${owned.level || 1} / ${weaponDamageLabel(owned)} / ${ammoLabel(owned)}`
        : "\u672a\u62e5\u6709";
      return `
        <div class="developer-row${owned ? " is-owned" : ""}">
          <div>
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(details)}</span>
          </div>
          <div class="developer-actions">
            <button type="button" data-dev-action="weapon-add" data-weapon-id="${escapeHtml(id)}">+</button>
            <button type="button" data-dev-action="weapon-remove" data-weapon-id="${escapeHtml(id)}" ${owned ? "" : "disabled"}>-</button>
          </div>
        </div>
      `;
    }).join("");
    const buffRows = buffRewardIds.map((name) => {
      const count = player?.buffs?.filter((buff) => buff === name).length || 0;
      const details = buffDetails[name];
      return `
        <div class="developer-row${count ? " is-owned" : ""}">
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(details?.type || "\u589e\u76ca")} / x${count}</span>
          </div>
          <div class="developer-actions">
            <button type="button" data-dev-action="buff-add" data-buff="${escapeHtml(name)}">+</button>
            <button type="button" data-dev-action="buff-remove" data-buff="${escapeHtml(name)}" ${count ? "" : "disabled"}>-</button>
          </div>
        </div>
      `;
    }).join("");
    const customRows = developerCustomEnemyDefs().map((enemy) => `
      <label class="developer-custom-row">
        <span>
          <strong>${escapeHtml(enemy.name)}</strong>
          <small>${escapeHtml(weaponKindLabel(enemy.kind))} / ${escapeHtml(enemy.pattern || "none")} / ${Math.round(enemy.hp || 0)} HP</small>
        </span>
        <input
          type="number"
          min="0"
          max="12"
          step="1"
          value="0"
          data-custom-enemy-count="${escapeHtml(enemy.id)}"
          aria-label="${escapeHtml(enemy.name)}数量"
        >
      </label>
    `).join("");
    return `
      <div class="developer-panel">
        <p class="developer-status">${escapeHtml(status)}</p>
        <div class="developer-grid">
          <section class="developer-section">
            <h3>&#27494;&#22120;</h3>
            ${weaponRows}
          </section>
          <section class="developer-section">
            <h3>&#22686;&#30410;</h3>
            ${buffRows}
          </section>
        </div>
        <section class="developer-section developer-custom-room">
          <h3>自定义房间</h3>
          <p>设置每种怪物的数量后进入测试房。自定义房间不会结算奖励，也不会记录排行榜。</p>
          ${game.developerCustomMessage ? `<p class="developer-custom-message">${escapeHtml(game.developerCustomMessage)}</p>` : ""}
          <div class="developer-custom-grid">
            ${customRows}
          </div>
          <div class="developer-custom-actions">
            <button class="primary-action" type="button" data-dev-action="custom-room-start">进入自定义房间</button>
          </div>
        </section>
      </div>
    `;
  }

  function handleDeveloperAction(button) {
    const player = ensureDeveloperPlayer();
    if (!player) return false;
    game.developerMode = true;
    game.developerModeUsed = true;
    const action = button?.dataset?.devAction;
    let changed = false;
    if (action === "custom-room-start") {
      const started = startDeveloperCustomRoomFromPanel();
      if (!started && !ui.modal.hidden && ui.modal.dataset.kind === "developer") {
        ui.modalBody.innerHTML = developerMarkup();
      }
      return started;
    }
    if (action === "weapon-add") {
      changed = addWeapon(player, button.dataset.weaponId, true);
    } else if (action === "weapon-remove") {
      changed = removeWeapon(player, button.dataset.weaponId);
    } else if (action === "buff-add") {
      const buff = button.dataset.buff;
      if (buffRewardIds.includes(buff)) {
        grantBuff(player, buff);
        changed = true;
      }
    } else if (action === "buff-remove") {
      changed = removeBuff(player, button.dataset.buff);
    }
    if (!changed) return false;
    updateHud();
    if (!ui.modal.hidden && ui.modal.dataset.kind === "developer") {
      ui.modalBody.innerHTML = developerMarkup();
    }
    return true;
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

  function funFactTime(seconds) {
    return Number(seconds) > 0 ? formatLeaderboardTime(seconds) : "暂无";
  }

  function funFactCount(value, suffix = "次") {
    const count = Math.max(0, Math.round(Number(value || 0)));
    return count ? `${count}${suffix}` : "暂无";
  }

  function funFactPercent(value, total) {
    const safeTotal = Math.max(0, Number(total || 0));
    if (!safeTotal) return "暂无";
    return `${Math.round((Math.max(0, Number(value || 0)) / safeTotal) * 100)}%`;
  }

  function funFactAverage(value, total, suffix = "") {
    const safeTotal = Math.max(0, Number(total || 0));
    if (!safeTotal) return "暂无";
    const average = Math.round((Number(value || 0) / safeTotal) * 10) / 10;
    return `${average}${suffix}`;
  }

  function topCountEntry(counts, labels = {}) {
    const [key, count] = Object.entries(counts || {})
      .filter(([, value]) => Number(value) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0]), "zh-CN"))[0] || [];
    if (!key) return { label: "暂无", count: 0, text: "暂无" };
    const label = labels[key] || weapons[key]?.name || key;
    return { label, count, text: `${label} · ${count}次` };
  }

  function funFactSection(title, rows) {
    return `
      <section class="fun-fact-section">
        <h3>${title}</h3>
        <div class="fun-fact-grid">
          ${rows.map(([label, value]) => `
            <div class="fun-fact-card">
              <span>${label}</span>
              <strong>${value}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function funFactsPager(pageIndex, totalPages) {
    return `
      <div class="fun-facts-pager" aria-label="趣味知识分页">
        <button type="button" data-fun-facts-page="${Math.max(0, pageIndex - 1)}" ${pageIndex <= 0 ? "disabled" : ""}>上一页</button>
        <span>${pageIndex + 1} / ${totalPages}</span>
        <button type="button" data-fun-facts-page="${Math.min(totalPages - 1, pageIndex + 1)}" ${pageIndex >= totalPages - 1 ? "disabled" : ""}>下一页</button>
      </div>
    `;
  }

  function funFactsMarkup(stats = readFunStats()) {
    const normalized = normalizeFunStats(stats);
    const averageSeconds = normalized.bossClears && normalized.totalSeconds
      ? Math.round(normalized.totalSeconds / normalized.bossClears)
      : 0;
    const averageRunSeconds = normalized.totalRuns && normalized.totalRunSeconds
      ? Math.round(normalized.totalRunSeconds / normalized.totalRuns)
      : 0;
    const routeLabels = {
      direct: "直面 Boss",
      prepared: "准备后挑战",
      full: "六房全清",
    };
    const roomLabels = {
      monster: "微积分",
      chest: "随机 A",
      geometry: "欧氏几何",
      linear: "线性代数",
      randomB: "随机 B",
      randomC: "随机 C",
      boss: "Boss 房",
      unknown: "未知位置",
    };
    const topRoute = topCountEntry(normalized.routeCounts, routeLabels);
    const topBossDamageWeapon = topCountEntry(normalized.bossTopDamageWeaponCounts);
    const topDangerRoom = topCountEntry(normalized.deathRoomCounts, roomLabels);
    const topDangerStage = topCountEntry(normalized.deathStageCounts);
    const bestHp = normalized.bestRemainingHpMax
      ? `${normalized.bestRemainingHp} / ${normalized.bestRemainingHpMax}`
      : "暂无";
    const worstHp = normalized.worstRemainingHpMax
      ? `${normalized.worstRemainingHp} / ${normalized.worstRemainingHpMax}`
      : "暂无";
    const clearRate = normalized.totalRuns ? funFactPercent(normalized.bossClears, normalized.totalRuns) : "暂无";
    const swordFinalClears = normalized.finalWeaponCounts.sword || 0;
    const swordFaithIndex = normalized.bossClears
      ? `${clamp(Math.round(
        (normalized.swordOnlyClears / normalized.bossClears) * 70
        + (swordFinalClears / normalized.bossClears) * 30
      ), 0, 100)} / 100`
      : "暂无";
    const firepowerOverloadText = `${funFactCount(normalized.firepowerOverloadClears)} / ${funFactPercent(normalized.firepowerOverloadClears, normalized.bossClears)}`;
    const pages = [
      {
        title: "探索档案",
        sections: [
          funFactSection("全局概览", [
            ["探索总次数", funFactCount(normalized.totalRuns)],
            ["通关率", clearRate],
            ["通关次数", funFactCount(normalized.bossClears)],
            ["失败次数", funFactCount(normalized.failedRuns)],
          ]),
          funFactSection("用时概览", [
            ["最快通关", funFactTime(normalized.fastestSeconds)],
            ["平均通关战斗用时", funFactTime(averageSeconds)],
            ["平均单局战斗用时", funFactTime(averageRunSeconds)],
            ["累计战斗用时", funFactTime(normalized.totalRunSeconds)],
          ]),
        ],
      },
      {
        title: "翻车记录",
        sections: [
          funFactSection("危险位置", [
            ["最危险房间", topDangerRoom.text],
            ["该房间翻车次数", topDangerRoom.count ? `${topDangerRoom.count}次` : "暂无"],
            ["最容易翻车阶段", topDangerStage.text],
            ["失败占比", `${funFactCount(normalized.failedRuns)} / ${funFactPercent(normalized.failedRuns, normalized.totalRuns)}`],
          ]),
          funFactSection("路线风险", [
            ["直面 Boss 通关", `${funFactCount(normalized.directBossClears)} / ${funFactPercent(normalized.directBossClears, normalized.bossClears)}`],
            ["准备后通关", `${funFactCount(normalized.preparedClears)} / ${funFactPercent(normalized.preparedClears, normalized.bossClears)}`],
            ["六房全清", `${funFactCount(normalized.fullPrepClears)} / ${funFactPercent(normalized.fullPrepClears, normalized.bossClears)}`],
            ["最常见通关路线", topRoute.text],
          ]),
        ],
      },
      {
        title: "战术偏好",
        sections: [
          funFactSection("通关习惯", [
            ["终战输出最多武器", topBossDamageWeapon.text],
            ["圣剑独行", `${funFactCount(normalized.swordOnlyClears)} / ${funFactPercent(normalized.swordOnlyClears, normalized.bossClears)}`],
            ["平均完成房间", funFactAverage(normalized.totalRoomsCompleted, normalized.bossClears, "间")],
            ["平均持有武器", funFactAverage(normalized.totalWeaponsFound, normalized.bossClears, "把")],
          ]),
          funFactSection("打法倾向", [
            ["裸考勇士比例", `${funFactCount(normalized.directBossClears)} / ${funFactPercent(normalized.directBossClears, normalized.bossClears)}`],
            ["最狼狈通关", worstHp],
            ["圣剑信仰指数", swordFaithIndex],
            ["火力过剩指数", firepowerOverloadText],
          ]),
        ],
      },
      {
        title: "最高单项纪录",
        sections: [
          funFactSection("巅峰记录", [
            ["最高积分", normalized.bestScore ? `${normalized.bestScore}` : "暂无"],
            ["最快通关", funFactTime(normalized.fastestSeconds)],
            ["最长战斗用时", funFactTime(normalized.longestSeconds)],
            ["最高剩余生命", bestHp],
          ]),
          funFactSection("资源记录", [
            ["最多完成房间", funFactCount(normalized.mostRooms, "间")],
            ["最多持有武器", funFactCount(normalized.maxWeaponsFound, "把")],
            ["累计完成房间", funFactCount(normalized.totalRoomsCompleted, "间")],
            ["累计发现武器", funFactCount(normalized.totalWeaponsFound, "把")],
          ]),
        ],
      },
    ];
    const pageIndex = clamp(funFactsPageIndex, 0, pages.length - 1);
    funFactsPageIndex = pageIndex;
    const page = pages[pageIndex];

    return `
      <div class="fun-facts-board">
        <div class="fun-fact-summary">
          <strong>${funFactCount(normalized.totalRuns)}</strong>
          <span>全部玩家已结算探索 · 通关率 ${clearRate}</span>
        </div>
        <div class="fun-fact-page-head">
          <span>全服作战档案</span>
          <strong>${page.title}</strong>
        </div>
        ${page.sections.join("")}
        ${funFactsPager(pageIndex, pages.length)}
        <p class="leaderboard-note">趣味知识统计当前服务器已记录的全部玩家结算数据；排行榜仍只收录通关成绩，战斗用时只计算怪物房和 Boss 房。</p>
      </div>
    `;
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
                  <th>战斗用时</th>
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
        ${leaderboardTableMarkup("战斗用时最短", "time", boards.time, "暂无竞速记录。")}
        ${leaderboardTableMarkup("只使用圣剑通关", "sword", boards.sword, "暂无圣剑通关记录。")}
      </div>
      <p class="leaderboard-note">排行榜用时只统计怪物房和 Boss 房的实际战斗时间；宝箱房和走廊不计时。积分会给战斗房更高路线分，宝箱房分值较低；前 120 秒的竞速收益更高，越接近极限成绩，每提前 1 秒加分越多，超过 5 分钟战斗用时后会持续扣分。</p>
    `;
  }

  function openModal(kind) {
    if (kind === "funFacts") funFactsPageIndex = 0;
    if (kind === "weapons") weaponInfoPageIndex = 0;
    const content = {
      weapons: {
        title: "武器与增益",
        body: weaponStatsMarkup(),
      },
      enemyCodex: {
        title: "名人堂",
        body: enemyCodexMarkup(),
      },
      funFacts: {
        title: "趣味知识",
        body: funFactsMarkup(),
      },
      inventory: {
        title: "背包",
        body: inventoryMarkup(),
      },
      developer: {
        title: "\u5f00\u53d1\u8005\u6a21\u5f0f",
        body: developerMarkup(),
      },
      betaShop: {
        title: "β 学分商店",
        body: betaBossShopMarkup(),
      },
      leaderboard: {
        title: "通关排行榜",
        body: leaderboardMarkup(),
      },
      settings: {
        title: "设置",
        body: `
          <p>基础版暂时采用固定难度和固定键位。后续可以继续加入音量、难度和画面设置。</p>
        `,
      },
    }[kind];
    ui.modal.dataset.kind = kind;
    ui.modalPanel.classList.toggle("modal-panel-wide", kind === "weapons" || kind === "enemyCodex" || kind === "inventory" || kind === "leaderboard" || kind === "funFacts" || kind === "developer" || kind === "betaShop");
    ui.modalPanel.classList.toggle("modal-panel-no-title", kind === "funFacts");
    if (kind === "funFacts") {
      ui.modalPanel.setAttribute("aria-label", content.title);
      ui.modalPanel.removeAttribute("aria-labelledby");
    } else {
      ui.modalPanel.removeAttribute("aria-label");
      ui.modalPanel.setAttribute("aria-labelledby", "modalTitle");
    }
    ui.modalTitle.textContent = content.title;
    ui.modalBody.innerHTML = content.body;
    ui.modal.hidden = false;
    if (kind === "funFacts") {
      refreshFunFacts(true);
    }
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

  function isTextInputTarget(target) {
    return Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));
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

  function isEnemyBackHit(enemy, source) {
    if (!enemy || !source || game.activeRoom !== "monster") return false;
    const facing = enemy.facingAngle ?? Math.PI / 2;
    const sourceAngle = Math.atan2(source.y - enemy.y, source.x - enemy.x);
    return Math.abs(angleDelta(sourceAngle, facing + Math.PI)) <= backHitHalfAngle;
  }

  function lockGaussBottomHp(enemy) {
    if (!hasEnemyMechanic(enemy, "gaussHalfField") || enemyInTopHalf(enemy)) return false;
    const gate = enemy.maxHp * 0.1;
    if (enemy.hp <= gate) {
      enemy.hp = gate;
      enemy.healFlash = Math.max(enemy.healFlash || 0, 0.35);
      return true;
    }
    return false;
  }

  function startJordanTransition(enemy) {
    if (!hasEnemyMechanic(enemy, "jordanDomain") || enemy.jordanDomainActive || enemy.jordanTransitionStarted) return false;
    if (enemyHpRatio(enemy) > 0.5) return false;
    enemy.jordanTransitionStarted = true;
    enemy.jordanTransitionTimer = 1.05;
    enemy.hp = Math.max(enemy.hp, enemy.maxHp * 0.5);
    enemy.fireTimer = Math.max(enemy.fireTimer || 0, 1.05);
    enemy.shieldFlash = 0.65;
    burst(enemy.x, enemy.y, enemy.color || colors.warning, 24);
    return true;
  }

  function onMonsterDamaged(enemy, amount) {
    if (!enemy || amount <= 0) return;
    if (hasEnemyMechanic(enemy, "taylorTripleDash") && (enemy.taylorRestTimer || 0) > 0) {
      applyEnemySlow(0.86, 2.4);
      enemy.shieldFlash = Math.max(enemy.shieldFlash || 0, 0.25);
    }
    startJordanTransition(enemy);
    lockGaussBottomHp(enemy);
  }

  function monsterHitDamage(baseDamage, enemy, source) {
    const backHit = isEnemyBackHit(enemy, source);
    const receivedMultiplier = enemyReceivedDamageMultiplier(enemy);
    return {
      amount: baseDamage * receivedMultiplier * (backHit ? backHitMultiplier : 1),
      backHit,
      absorbed: receivedMultiplier <= 0,
    };
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

  ui.start.addEventListener("click", openVersionSelect);
  ui.versionAlpha?.addEventListener("click", () => startVersion("alpha"));
  ui.versionBeta?.addEventListener("click", () => startVersion("beta"));
  ui.versionBack?.addEventListener("click", () => {
    mode = "menu";
    showScreen("menu");
  });
  hud.inventory?.addEventListener("click", () => openModal("inventory"));
  ui.weaponStats.addEventListener("click", () => openModal("weapons"));
  ui.enemyCodex?.addEventListener("click", () => openModal("enemyCodex"));
  ui.funFacts?.addEventListener("click", () => openModal("funFacts"));
  ui.leaderboard?.addEventListener("click", () => openModal("leaderboard"));
  ui.settings.addEventListener("click", () => openModal("settings"));
  ui.modalClose.addEventListener("click", closeModal);
  ui.modal.addEventListener("click", (event) => {
    if (event.target === ui.modal) closeModal();
  });
  ui.modalBody.addEventListener("click", (event) => {
    const betaShopBuy = event.target.closest("[data-beta-shop-buy]");
    if (betaShopBuy && ui.modal.dataset.kind === "betaShop") {
      buyBetaShopItem(Number(betaShopBuy.dataset.betaShopBuy));
      return;
    }
    const betaShopAction = event.target.closest("[data-beta-shop-action]");
    if (betaShopAction && ui.modal.dataset.kind === "betaShop") {
      const action = betaShopAction.dataset.betaShopAction;
      if (action === "refresh") refreshBetaBossShop();
      if (action === "start") startBossFromBetaShop();
      return;
    }
    const developerButton = event.target.closest("[data-dev-action]");
    if (developerButton && ui.modal.dataset.kind === "developer") {
      handleDeveloperAction(developerButton);
      return;
    }
    const weaponInfoButton = event.target.closest("[data-weapon-info-page]");
    if (weaponInfoButton && ui.modal.dataset.kind === "weapons") {
      const nextPage = Number(weaponInfoButton.dataset.weaponInfoPage);
      if (!Number.isFinite(nextPage)) return;
      weaponInfoPageIndex = Math.max(0, Math.round(nextPage));
      ui.modalBody.innerHTML = weaponStatsMarkup();
      return;
    }
    const button = event.target.closest("[data-fun-facts-page]");
    if (!button || ui.modal.dataset.kind !== "funFacts") return;
    const nextPage = Number(button.dataset.funFactsPage);
    if (!Number.isFinite(nextPage)) return;
    funFactsPageIndex = Math.max(0, Math.round(nextPage));
    ui.modalBody.innerHTML = funFactsMarkup();
  });
  [ui.monsterRoom, ui.chestRoom, ui.geometryRoom, ui.linearRoom, ui.randomRoomB, ui.randomRoomC, ui.bossRoom].forEach((door) => {
    door.tabIndex = -1;
  });
  ui.challengeOptions.forEach((button) => {
    button.addEventListener("click", () => beginMonsterChallenge(button.dataset.challengeCount));
  });
  ui.challengeBack?.addEventListener("click", () => enterMap("当前状态：已返回地图，可以重新选择教室。"));
  ui.acceptWeapon?.addEventListener("click", () => toggleRewardWeaponSelection());
  ui.skipWeapon?.addEventListener("click", () => toggleRewardBuffSelection(0));
  ui.secondBuffReward?.addEventListener("click", () => toggleRewardBuffSelection(1));
  ui.confirmReward?.addEventListener("click", () => resolveRewardChoice("selection"));
  ui.backToMap.addEventListener("click", () => {
    if (game.pendingWeaponChoice) resolveRewardChoice("none");
    enterMap("当前状态：奖励已整理，可以继续选择房间或挑战 Boss。");
  });
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
    if (event.code === "KeyI" && event.shiftKey && !isTextInputTarget(event.target)) {
      event.preventDefault();
      toggleDeveloperMode();
      return;
    }
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
    openVersionSelect,
    startVersion,
    startMonsterRoom,
    openChestRoom,
    startBossRoom,
    startRandomRoom,
    openChallengeSelect,
    beginMonsterChallenge,
    completeActiveRoom() {
      if (game.activeRoom === "monster" && game.enemies.length) {
        let guard = 0;
        while (game.enemies.length && guard < 8) {
          game.enemies.forEach((enemy) => {
            enemy.mechanics = (enemy.mechanics || []).filter(
              (mechanic) => !["splitOnDeath", "gaussHalfField", "jordanDomain"].includes(mechanic)
            );
            enemy.jordanTransitionTimer = 0;
            enemy.hp = 0;
          });
          updateMonsterRoom(0);
          guard += 1;
        }
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
    previewSplitEnemyForVerify(index = 0) {
      const enemy = game.enemies[Number(index) || 0];
      if (!enemy) return { didSplit: false, children: [], state: this.state() };
      const originalLength = game.enemies.length;
      const didSplit = spawnSplitEnemies(enemy);
      const children = game.enemies.slice(originalLength).map((child) => ({
        id: child.id,
        pattern: child.pattern,
        mechanics: [...(child.mechanics || [])],
        splitChild: Boolean(child.splitChild),
        randomDrift: Boolean(child.randomDrift),
        fireEvery: Number((child.fireEvery || 0).toFixed(3)),
        fireTimer: Number((child.fireTimer || 0).toFixed(3)),
        driftIntervalMultiplier: child.driftIntervalMultiplier || 1,
        dashIntervalMultiplier: child.dashIntervalMultiplier || 1,
        hp: Math.max(0, Math.ceil(child.hp)),
        maxHp: Math.max(1, Math.ceil(child.maxHp)),
      }));
      game.enemies.splice(originalLength);
      return { didSplit, children, state: this.state() };
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
        maxHp: game.player?.maxHp,
        shield: game.player?.shield || 0,
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
    choosePendingBuffForVerify(index = 0) {
      resolveRewardChoice("buff", Number(index) || 0);
      return this.state();
    },
    togglePendingWeaponForVerify() {
      toggleRewardWeaponSelection();
      return this.state();
    },
    togglePendingBuffForVerify(index = 0) {
      toggleRewardBuffSelection(Number(index) || 0);
      return this.state();
    },
    confirmPendingRewardForVerify() {
      resolveRewardChoice("selection");
      return this.state();
    },
    declinePendingRewardForVerify() {
      resolveRewardChoice("none");
      return this.state();
    },
    addWeaponForVerify(id) {
      const added = addWeapon(game.player, id, true);
      if (added) rememberRewardFamily(id);
      updateHud();
      return this.state();
    },
    setCreditsForVerify(value) {
      game.credits = Math.max(0, Math.round(Number(value) || 0));
      updateMap();
      return this.state();
    },
    openBetaBossShopForVerify() {
      openBetaBossShop();
      return this.state();
    },
    buyBetaShopItemForVerify(index = 0) {
      buyBetaShopItem(Number(index) || 0);
      return this.state();
    },
    refreshBetaShopForVerify() {
      refreshBetaBossShop();
      return this.state();
    },
    startBossFromShopForVerify() {
      startBossFromBetaShop();
      return this.state();
    },
    toggleDeveloperModeForVerify() {
      toggleDeveloperMode();
      return this.state();
    },
    setDeveloperModeForVerify(active = true) {
      setDeveloperMode(Boolean(active), false);
      return this.state();
    },
    setBattleSecondsForVerify(seconds = 0) {
      game.elapsed = Math.max(0, Number(seconds) || 0) * 1000;
      updateHud();
      return this.state();
    },
    addLeaderboardEntry(entry) {
      saveLeaderboardEntry({ ...entry, scoreVersion: leaderboardScoreVersion, timeMode: "combat" });
      return this.state();
    },
    prepareLeaderboardNameForVerify(entry) {
      const normalized = normalizeLeaderboardEntry({ ...entry, scoreVersion: leaderboardScoreVersion, timeMode: "combat" });
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
    finishGameForVerify(win = true, options = {}) {
      finishGame(Boolean(win), options);
      return this.state();
    },
    showSwordEndingForVerify(options = {}) {
      resetGame();
      const completedKeys = new Set(options.completedKeys || []);
      completedRoomKeys.forEach((key) => {
        game.completed[key] = completedKeys.has(key);
      });
      game.kills = Math.max(0, Math.round(Number(options.kills ?? game.kills)));
      game.weaponsFound = 1;
      game.usedNonSwordWeapon = false;
      game.elapsed = Math.max(1, Number(options.seconds || 1)) * 1000;
      if (game.player) {
        game.player.hp = clamp(Number(options.hp ?? game.player.hp), 1, game.player.maxHp);
      }
      finishGame(true, {
        seconds: Math.max(1, Math.round(Number(options.seconds || 1))),
        saveLeaderboard: false,
      });
      return this.state();
    },
    setPlayerHp(value) {
      if (game.player) {
        game.player.hp = clamp(Number(value) || game.player.hp, 1, game.player.maxHp);
      }
      updateHud();
      return this.state();
    },
    setPlayerPositionForVerify(x, y) {
      if (game.player) {
        const point = arenaPoint(Number(x) || game.player.x, Number(y) || game.player.y, 20);
        game.player.x = point.x;
        game.player.y = point.y;
        resolvePlayerObstacles();
      }
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
    damageBossCoreForVerify(id, amount, weaponId = "sword") {
      const core = game.boss?.cores.find((item) => item.id === id);
      if (!core) return null;
      const before = Math.max(0, core.hp);
      const beforeShield = Math.max(0, core.shield || 0);
      damageBossCore(core, Number(amount) || 0, weaponId, weapons[weaponId]?.name || weaponId);
      return {
        id,
        front: isBossCoreFront(core),
        domain: isBossCoreInDomain(core),
        before,
        beforeShield,
        after: Math.max(0, core.hp),
        afterShield: Math.max(0, core.shield || 0),
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
        randomRooms: { ...game.randomRooms },
        hp: game.player?.hp,
        maxHp: game.player?.maxHp,
      };
      const completedKeys = new Set(options.completedKeys || []);
      completedRoomKeys.forEach((key) => {
        game.completed[key] = completedKeys.has(key);
      });
      const randomRoomTypes = options.randomRoomTypes || {};
      Object.keys(game.randomRooms).forEach((key) => {
        const type = randomRoomTypes[key];
        game.randomRooms[key] = type ? { type } : null;
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
      game.randomRooms = previous.randomRooms;
      if (game.player) {
        game.player.hp = previous.hp;
        game.player.maxHp = previous.maxHp;
      }
      return score;
    },
    forceBossMechanic(kind) {
      const boss = game.boss;
      if (!boss) return this.state();
      if (kind === "rotate") boss.rotateTimer = 0;
      if (kind === "cauchy") startBossDomain(boss, bossCoreById("cauchy"));
      if (kind === "descartes") startBossDomain(boss, bossCoreById("descartes"));
      if (kind === "gauss") startBossDomain(boss, bossCoreById("gauss"));
      if (kind === "cauchyHighlight") highlightRandomCauchyCandidate(boss);
      if (kind === "gaussZones") createGaussZones(bossCoreById("gauss"));
      if (kind === "cauchyAttack") {
        const core = bossCoreById("cauchy");
        if (core) fireCauchySquares(corePosition(core), core);
      }
      if (kind === "descartesAttack") {
        const core = bossCoreById("descartes");
        if (core) fireDescartesCross(corePosition(core), core);
      }
      return this.state();
    },
    state: () => ({
      mode,
      versionChannel: game.versionChannel || "alpha",
      credits: game.credits || 0,
      betaBossShopEntered: Boolean(game.betaBossShop?.entered),
      betaBossShopRefreshCost: game.betaBossShop?.refreshCost || 1,
      betaBossShopMessage: game.betaBossShop?.message || "",
      betaBossShopStock: (game.betaBossShop?.stock || []).map((item) => ({
        type: item.type,
        id: item.id,
        name: betaShopItemName(item),
        purchased: Boolean(item.purchased),
      })),
      developerMode: Boolean(game.developerMode),
      developerModeUsed: Boolean(game.developerModeUsed),
      activeRoom: game.activeRoom,
      activeRoomKey: game.activeRoomKey,
      battleSeconds: Math.round(game.elapsed / 1000),
      hp: game.player?.hp,
      maxHp: game.player?.maxHp,
      shield: game.player?.shield || 0,
      blockCharges: game.player?.blockCharges || 0,
      blockTimer: game.player?.blockTimer || 0,
      mistakeBoostTimer: game.player?.mistakeBoostTimer || 0,
      weaponSealTimer: game.player?.weaponSealTimer || 0,
      weaponSealSourceId: game.player?.weaponSealSourceId || "",
      enemySlowTimer: game.player?.enemySlowTimer || 0,
      cauchyDotTimer: game.player?.cauchyDotTimer || 0,
      gpaGuardUsed: Boolean(game.player?.gpaGuardUsed),
      weapon: game.player?.weapon ? displayWeaponName(game.player.weapon) : "",
      currentWeaponId: game.player?.weapon?.id || "",
      currentWeaponAmmo: game.player?.weapon && !game.player.weapon.infiniteAmmo ? game.player.weapon.ammo : null,
      currentWeaponMagazine: game.player?.weapon && !game.player.weapon.infiniteAmmo ? game.player.weapon.magazine : null,
      currentWeaponReloading: Boolean(game.player?.weapon?.reloading),
      currentWeaponReloadTimer: game.player?.weapon?.reloading ? Number((game.player.weapon.reloadTimer || 0).toFixed(3)) : 0,
      weaponIndex: game.player?.weaponIndex || 0,
      ammo: game.player?.weapon ? ammoLabel(game.player.weapon) : "",
      weaponLevel: game.player?.weapon?.level || 0,
      weaponDamage: game.player?.weapon ? game.player.weapon.damage * weaponDamageScale(game.player.weapon) : 0,
      effectiveWeaponDamage: game.player?.weapon ? game.player.weapon.damage * weaponDamageScale(game.player.weapon) * playerDamageBuffMultiplier(game.player) : 0,
      damageBuffMultiplier: game.player ? playerDamageBuffMultiplier(game.player) : 1,
      incomingDamageMultiplier: game.player ? incomingDamageMultiplier(game.player) : 1,
      attackCooldownMultiplier: game.player ? playerAttackCooldownMultiplier(game.player) : 1,
      weaponCooldown: game.player?.weapon ? game.player.weapon.cooldown * playerAttackCooldownMultiplier(game.player) : 0,
      effectiveReloadTime: game.player?.weapon ? weaponReloadTime(game.player.weapon, game.player) : 0,
      chickenBuffReady: Boolean(game.player && hasBuff(game.player, "鸡煲") && game.elapsed >= chickenHotpotDelayMs),
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
      funStats: readFunStats(),
      leaderboardBoards: Object.fromEntries(Object.entries(leaderboardRankings()).map(([kind, rows]) => [kind, rows.length])),
      pendingWeaponChoice: Boolean(game.pendingWeaponChoice),
      pendingWeaponId: game.pendingWeaponChoice?.weaponId || "",
      pendingAltBuff: rewardChoiceBuffIds(game.pendingWeaponChoice)[0] || "",
      pendingBuffIds: rewardChoiceBuffIds(game.pendingWeaponChoice),
      pendingAllowWeaponBuff: Boolean(game.pendingWeaponChoice?.allowWeaponWithBuff),
      pendingSelectedWeapon: game.pendingWeaponChoice ? rewardSelection(game.pendingWeaponChoice).weapon : false,
      pendingSelectedBuffIndex: game.pendingWeaponChoice ? rewardSelection(game.pendingWeaponChoice).buffIndex : null,
      pendingSelectedBuffIndexes: game.pendingWeaponChoice ? rewardSelection(game.pendingWeaponChoice).buffIndexes : [],
      pendingCanConfirmReward: game.pendingWeaponChoice ? Boolean(rewardSelection(game.pendingWeaponChoice).weapon || rewardSelection(game.pendingWeaponChoice).buffIndexes.length) : false,
      pendingWeaponName: game.pendingWeaponChoice?.weaponId ? weaponChoiceName(game.pendingWeaponChoice.weaponId) : "",
      pendingLeaderboardEntry: Boolean(game.pendingLeaderboardEntry),
      leaderboardNameFormHidden: Boolean(ui.leaderboardNameForm?.hidden),
      usedNonSwordWeapon: game.usedNonSwordWeapon,
      recentRewardFamilies: [...(game.recentRewardFamilies || [])],
      swordOnlyRun: game.player ? isSwordOnlyRun() : false,
      kills: game.kills,
      completed: { ...game.completed },
      randomRooms: { ...game.randomRooms },
      pendingChallenge: Boolean(game.pendingChallenge),
      challengeCount: game.challengeCount,
      defeatedInRoom: game.defeatedInRoom,
      monsterClearDelay: game.monsterClearDelay || 0,
      enemyCount: game.enemies.length,
      enemyMechanics: game.enemies.map((enemy) => ({
        id: enemy.id,
        name: enemy.name || "",
        kind: enemy.kind,
        pattern: enemy.pattern,
        mechanics: [...(enemy.mechanics || [])],
        splitChild: Boolean(enemy.splitChild),
        randomDrift: Boolean(enemy.randomDrift),
        fireEvery: Number((enemy.fireEvery || 0).toFixed(3)),
        fireTimer: Number((enemy.fireTimer || 0).toFixed(3)),
        driftTimer: Number((enemy.driftTimer || 0).toFixed(3)),
        driftIntervalMultiplier: enemy.driftIntervalMultiplier || 1,
        dashTimer: Number((enemy.dashTimer || 0).toFixed(3)),
        dashIntervalMultiplier: enemy.dashIntervalMultiplier || 1,
        hp: Math.max(0, Math.ceil(enemy.hp)),
        maxHp: Math.max(1, Math.ceil(enemy.maxHp || enemy.hp || 1)),
        lhopitalInvincibleTimer: enemy.lhopitalInvincibleTimer || 0,
        lhopitalRestTimer: enemy.lhopitalRestTimer || 0,
        lhopitalSlashRemaining: enemy.lhopitalSlashRemaining || 0,
        quadrantWarn: enemy.quadrantWarnTimer || 0,
        dashWarn: enemy.dashWarnTimer || 0,
        dashActive: enemy.dashActiveTimer || 0,
        dashSequenceRemaining: enemy.dashSequenceRemaining || 0,
        archimedesDashWarn: enemy.archimedesDashWarnTimer || 0,
        archimedesDashActive: enemy.archimedesDashActiveTimer || 0,
        archimedesWallDashCount: enemy.archimedesWallDashCount || 0,
        taylorDashWarn: enemy.taylorDashWarnTimer || 0,
        taylorDashActive: enemy.taylorDashActiveTimer || 0,
        taylorRest: enemy.taylorRestTimer || 0,
        jacobiBlinkWarn: enemy.jacobiBlinkWarnTimer || 0,
        jordanTransition: enemy.jordanTransitionTimer || 0,
        jordanDomainActive: Boolean(enemy.jordanDomainActive),
        gaussTopHalf: hasEnemyMechanic(enemy, "gaussHalfField") ? enemyInTopHalf(enemy) : null,
      })),
      obstacleCount: game.obstacles.length,
      obstacleRects: game.obstacles.map((obstacle) => ({
        shape: obstacle.shape || "rect",
        x: Math.round(obstacle.x),
        y: Math.round(obstacle.y),
        w: Math.round(obstacle.w),
        h: Math.round(obstacle.h),
        thickness: Math.round(obstacle.thickness || Math.min(obstacle.w, obstacle.h)),
        area: Math.round(obstacleVisualArea(obstacle)),
        broken: Boolean(obstacle.broken),
        marked: Boolean(obstacle.marked),
        cauchyDomain: Boolean(obstacle.cauchyDomain),
        cauchyCoreWall: Boolean(obstacle.cauchyCoreWall),
        cauchyCandidate: Boolean(obstacle.cauchyCandidate),
      })),
      bossAttackTypes: game.boss?.cores.map((core) => core.attack) || [],
      bossPhase: game.boss?.phaseName || "",
      bossX: game.boss?.x || 0,
      bossY: game.boss?.y || 0,
      bossMoveBaseX: game.boss?.moveBaseX || 0,
      bossMoveOffset: game.boss ? game.boss.x - game.boss.moveBaseX : 0,
      bossMoveT: game.boss?.moveT || 0,
      bossRotationSteps: game.boss?.rotationSteps || 0,
      bossRotateTimer: game.boss?.rotateTimer || 0,
      bossInitialDomainCoreId: game.boss?.initialDomainCoreId || "",
      bossTopCoreId: game.boss ? bossTopCore(game.boss)?.id || "" : "",
      bossDomainCoreId: game.boss?.domainCoreId || "",
      bossDomainName: game.boss?.domainName || "",
      bossDomainElapsed: game.boss?.domainElapsed || 0,
      bossDomainCycleSeconds,
      bossGaussZoneBaseCount: gaussZoneBaseCount,
      bossGaussZoneMaxCount: gaussZoneMaxCount,
      bossGaussZoneDebuffDuration: gaussZoneDebuffDuration,
      bossGaussZoneCount: game.boss?.gaussZones?.length || 0,
      bossGaussZoneBonus: game.boss?.gaussZoneBonus || 0,
      bossGaussNextZoneCount: game.boss?.gaussNextZoneCount || 0,
      bossGaussDomainKillHealCount: game.boss?.gaussDomainKillHealCount || 0,
      bossGaussBoostedCoreIds: game.boss ? game.boss.cores.filter((core) => (core.domainShieldBonus || 0) > 0 || (core.domainDamageMultiplier || 1) > 1).map((core) => core.id) : [],
      bossInvisibleCoreIds: game.boss ? game.boss.cores.filter((core) => isBossCoreHidden(core)).map((core) => core.id) : [],
      bossRevealedCoreIds: game.boss ? game.boss.cores.filter((core) => core.hp > 0 && isBossCoreRevealed(core)).map((core) => core.id) : [],
      bossCoreRevealTimers: game.boss?.cores.map((core) => Math.max(0, Number((core.revealTimer || 0).toFixed(2)))) || [],
      bossFullPowerCoreId: game.boss?.fullPowerCoreId || "",
      bossDescartesQuadrant: game.boss?.descartesQuadrant || "",
      bossDescartesQuadrantChanges: game.boss?.descartesQuadrantChanges || 0,
      bossDescartesQuadrantProjectionCount: game.boss?.descartesQuadrantProjectionCount || 0,
      bossProjectionCount: game.enemies.filter((enemy) => enemy.bossProjection).length,
      bossCauchyDomainWallCount: game.obstacles.filter((obstacle) => obstacle.cauchyDomain).length,
      bossCauchyCoreWallCount: game.obstacles.filter((obstacle) => obstacle.cauchyCoreWall).length,
      bossCauchyCandidateCount: game.obstacles.filter((obstacle) => obstacle.cauchyCandidate && !obstacle.cauchyDomain).length,
      bossCauchyExplosionBulletCount: cauchyExplosionBulletCount,
      bossCauchyBombCount: game.boss?.cauchyBombs?.length || 0,
      bossLaserCount: game.boss?.laserCount || 0,
      bossShotPatternCounts: game.boss?.shotPatternCounts ? { ...game.boss.shotPatternCounts } : {},
      bossWeaponDamage: game.boss?.weaponDamage ? { ...game.boss.weaponDamage } : {},
      bossTopDamageWeapon: topBossDamageWeapon(),
      bossDefeatedCount: game.boss?.defeatedCount || 0,
      bossCoreHp: game.boss?.cores.map((core) => Math.max(0, Math.ceil(core.hp))) || [],
      bossCoreMaxHp: game.boss?.cores.map((core) => Math.max(1, Math.ceil(core.maxHp))) || [],
      bossCoreShield: game.boss?.cores.map((core) => Math.max(0, Math.ceil(core.shield || 0))) || [],
      bossFrontCoreIds: game.boss ? bossFrontCoreIds(game.boss) : [],
      bossInvulnerableCoreIds: game.boss ? game.boss.cores.filter((core) => core.hp > 0 && !isBossCoreFront(core, game.boss)).map((core) => core.id) : [],
      bossActiveCoreCount: game.boss ? bossActiveCores(game.boss).length : 0,
      bossObstacleBoomCount: game.boss?.obstacleBoomCount || 0,
      bossDirect: Boolean(game.boss?.direct),
      bossIntroActive: isBossIntroActive(),
      bossIntroElapsed: game.boss?.intro?.elapsed || 0,
      enemyShotPatterns: game.enemyShots.map((shot) => shot.pattern || "straight"),
      enemyPiercingShotCount: game.enemyShots.filter((shot) => shot.ignoresObstacles).length,
      enemyWeaponSealShotCount: game.enemyShots.filter((shot) => shot.weaponSeal).length,
      enemyWallSplitShotCount: game.enemyShots.filter((shot) => shot.wallSplit).length,
      enemyLaserCount: game.enemyLasers.length,
      activeLaserCount: game.enemyLasers.filter(isLaserActive).length,
      gaussDeathBeamCount: game.enemyLasers.filter((laser) => laser.deathBeam).length,
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
