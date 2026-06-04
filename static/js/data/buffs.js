(function (global) {
  const data = global.ExamGameData ||= {};
  const buffRewardIds = [
    "临时抱佛脚",
    "熬夜咖啡",
    "公式大全",
    "草稿纸",
    "错题本",
    "绩点守护",
    "学霸笔记",
    "鸡煲",
  ];

  const buffDetails = {
    临时抱佛脚: {
      type: "生存增益",
      effect: "生命上限提高 25%，获得时同步补足新增生命值。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    学霸笔记: {
      type: "战斗增益",
      effect: "造成伤害提高 20%。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    公式大全: {
      type: "战斗增益",
      effect: "攻击速度提高 20%。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    熬夜咖啡: {
      type: "战斗增益",
      effect: "移动速度提高 50%。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    草稿纸: {
      type: "战斗增益",
      effect: "换弹时间减少一半。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    错题本: {
      type: "防守反击",
      effect: "受到的所有伤害减少 25%；被击中后 4 秒内造成伤害提高 25%。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    绩点守护: {
      type: "生存增益",
      effect: "濒死时自动触发一次，恢复至 45% 最大生命值并获得短暂无敌。",
      source: "宝箱房或挑战多人时随机获得。",
    },
    鸡煲: {
      type: "后期爆发",
      effect: "累计战斗时间达到 20 秒后，造成伤害翻倍。",
      source: "宝箱房或挑战多人时随机获得。",
    },
  };

  data.buffRewardIds = buffRewardIds;
  data.buffDetails = buffDetails;
})(window);
