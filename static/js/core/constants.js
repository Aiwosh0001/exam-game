(function (global) {
  const colors = {
    paper: "#f4e8bd",
    chalk: "#59f06c",
    mint: "#9dffad",
    danger: "#ff5f5f",
    warning: "#ffc45d",
    cyan: "#5ee7d6",
    muted: "#a9b9a6",
    ink: "#050806",
    line: "rgba(171,202,156,0.24)",
  };

  const leaderboardScoreVersion = "combat-time-v2";
  const leaderboardStorageKey = "examGameLeaderboardCombatTimeV2";
  const leaderboardLimit = 10;
  const defaultLeaderboardName = "考生";
  const randomRoomMonsterChance = 1 / 3;
  const randomRoomChestChance = 2 / 3;
  const completedRoomKeys = ["monster", "chest", "geometry", "linear", "randomB", "randomC"];
  const characterSizeScale = 0.39;
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
  const cauchyExplosionBulletCount = 9;
  const cauchyFullPowerWallCount = 7;
  const cauchyFullPowerCycle = 7;
  const bossBreakWindowDuration = 2.6;
  const bossBreakDamageMultiplier = 1.35;
  const bossProjectionHp = 20;
  const bossProjectionLimit = 4;
  const gaussZoneBaseCount = 4;
  const gaussZoneResetCount = 3;
  const gaussZoneMaxCount = 7;
  const gaussZoneDuration = 7;
  const gaussZoneFireEvery = 2;
  const gaussZoneDebuffDuration = 5;
  const bossCoreInvisibleDuration = 18;
  const bossCoreRevealDuration = 2.8;
  const gaussFullPowerStealthEvery = 5;
  const gaussFullPowerStealthDuration = 5.8;
  const descartesFullPowerSpawnEvery = 5;
  const descartesQuadrantProjectionLimit = 4;
  const descartesExitProjectionLimit = 4;
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
      bossBreakWindowDuration,
      bossBreakDamageMultiplier,
      bossProjectionHp,
      bossProjectionLimit,
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
      descartesQuadrantProjectionLimit,
      descartesExitProjectionLimit,
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
