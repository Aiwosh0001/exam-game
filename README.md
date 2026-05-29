# 今天你挂科了吗？

CS101 计算机科学导论期末网站作品。

这是一个基于 Flask、HTML5 Canvas 和 JavaScript 制作的数学主题动作闯关游戏。玩家可以在走廊地图中选择进入不同房间，通过战斗获取武器和增益，也可以直接挑战 Boss。游戏包含武器切换、弹药与换弹、闪避、障碍物、背包、Boss 多核心机制和三类通关排行榜。

## 功能概览

- Flask 后端负责页面路由、模板渲染、静态资源管理和排行榜接口。
- HTML5 Canvas 负责游戏主体，包括移动、攻击、弹幕、碰撞、房间逻辑和 Boss 战。
- 走廊地图包含微积分、欧氏几何、线性代数、随机房、宝箱房和 Boss 房等入口。
- 武器和增益可在局内获得，重复获得武器会强化武器。
- 宝箱房提供随机武器和随机增益二选一。
- Boss 战包含三核心轮转、前排核心输出、后排核心无敌、左右移动和随机障碍物机制。
- 排行榜包含积分最高、通关时长最短、只使用圣剑通关三类榜单。

## 运行方法

先安装依赖：

```bash
pip install -r requirements.txt
```

启动项目：

```bash
python app.py
```

然后在浏览器打开：

```text
http://127.0.0.1:5000
```

如果需要让同一局域网内的其他设备访问，可以设置监听地址为 `0.0.0.0` 后再启动：

```bash
set HOST=0.0.0.0
python app.py
```

## 操作说明

- `WASD`：移动
- 鼠标：瞄准
- 鼠标左键：攻击
- 数字键：切换武器
- `Space`：闪避
- `E`：进入房间
- `B`：打开背包

## 项目结构

```text
app.py                  Flask 后端与排行榜接口
requirements.txt        Python 依赖
templates/index.html    页面模板
static/css/styles.css   页面样式
static/js/game.js       游戏主体逻辑
scripts/verify.mjs      本地自动化检查脚本
```
