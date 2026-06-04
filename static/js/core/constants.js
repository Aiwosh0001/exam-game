(function (global) {
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

  const leaderboardScoreVersion = "combat-time-v1";
  const leaderboardStorageKey = "examGameLeaderboardCombatTimeV1";
  const leaderboardLimit = 10;
  const defaultLeaderboardName = "考生";
  const randomRoomMonsterChance = 1 / 3;
  const randomRoomChestChance = 2 / 3;
  const completedRoomKeys = ["monster", "chest", "geometry", "linear", "randomB", "randomC"];
  const characterSizeScale = 0.65;
  const playerDamageScale = 0.9;
  const bossDamageScale = 0.85;
  const bossSizeScale = 0.65;
  const bossCoreOrbitRadius = 92 * bossSizeScale;
  const bossCoreHitRadius = 25 * bossSizeScale;
  const bossDomainCycleSeconds = 20;
  const bossInitialObstacleCount = 7;
  const cauchyDotDuration = 3;
  const cauchyDotDps = 2.2;
  const cauchyDomainWallCount = 5;
  const cauchyHighlightEvery = 4;
  const cauchyExplosionBulletCount = 10;
  const cauchyFullPowerWallCount = 7;
  const cauchyFullPowerCycle = 7;
  const bossProjectionHp = 20;
  const gaussZoneBaseCount = 4;
  const gaussZoneResetCount = 3;
  const gaussZoneMaxCount = 7;
  const gaussZoneDuration = 7;
  const gaussZoneFireEvery = 2;
  const gaussZoneDebuffDuration = 5;
  const bossCoreInvisibleDuration = 15;
  const bossCoreRevealDuration = 2;
  const gaussFullPowerStealthEvery = 5;
  const gaussFullPowerStealthDuration = 7;
  const descartesFullPowerSpawnEvery = 5;
  const backHitMultiplier = 1.45;
  const backHitHalfAngle = Math.PI * 0.38;
  const swordSlashReach = 38;
  const swordSlashRadius = 48;
  const directBossSwordDamage = 15;
  const directBossSwordReach = 42;
  const directBossSwordRadius = 56;
  const obstacleAreaMultiplier = 1.3;
  const obstacleThinnessScale = 0.92;
  const obstacleLengthScale = obstacleAreaMultiplier / obstacleThinnessScale;
  const obstacleMinThickness = 6;
  const obstacleMaxThickness = 9.5;
  const monsterShieldDuration = 1.05;
  const weaponSealDuration = 4.0;
  const enemySlowDuration = 2.6;
  const enemySlowMultiplier = 0.82;
  const jordanDomainRadius = 168;
  const jordanDomainTickEvery = 0.55;
  const gaussDeathBeamClearDelay = 0.9;

  global.ExamGameCore = Object.assign(global.ExamGameCore || {}, {
    colors,
    gameplayConstants: {
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
    },
  });
})(window);
