(function (global) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

    if (obstacle.shape === "line" || obstacle.shape === "curve" || obstacle.shape === "corner") {
      const hitRadius = radius + (obstacle.thickness || 8) / 2;
      const nearest = nearestPointOnPolyline(circleRef, obstacle.points || []);
      return nearest && nearest.distance <= hitRadius
        ? { nearestX: nearest.x, nearestY: nearest.y, distance: nearest.distance, collisionRadius: hitRadius }
        : null;
    }

    if (obstacle.shape === "brokenLine") {
      const hitRadius = radius + (obstacle.thickness || 8) / 2;
      const nearest = nearestPointOnSegments(circleRef, obstacle.segments || []);
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
    if (obstacle.segments?.length) {
      const points = obstacle.segments.flat();
      return {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      };
    }
    if (obstacle.points?.length) {
      return {
        x: obstacle.points.reduce((sum, point) => sum + point.x, 0) / obstacle.points.length,
        y: obstacle.points.reduce((sum, point) => sum + point.y, 0) / obstacle.points.length,
      };
    }
    return { x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2 };
  }

  function obstacleVisualArea(obstacle) {
    if (obstacle.shape === "line" || obstacle.shape === "curve" || obstacle.shape === "corner") {
      const points = obstacle.points || [];
      let length = 0;
      for (let i = 0; i < points.length - 1; i += 1) {
        length += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      }
      return length * (obstacle.thickness || 8);
    }
    if (obstacle.shape === "brokenLine") {
      return (obstacle.segments || []).reduce((total, segment) => {
        let length = 0;
        for (let i = 0; i < segment.length - 1; i += 1) {
          length += Math.hypot(segment[i + 1].x - segment[i].x, segment[i + 1].y - segment[i].y);
        }
        return total + length * (obstacle.thickness || 8);
      }, 0);
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

  function nearestPointOnSegments(point, segments) {
    let best = null;
    (segments || []).forEach((segment) => {
      const candidate = nearestPointOnPolyline(point, segment || []);
      if (candidate && (!best || candidate.distance < best.distance)) best = candidate;
    });
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

  global.ExamGameUtils = Object.assign(global.ExamGameUtils || {}, {
    angleDelta,
    circleObstacleCollision,
    circleObstacleHit,
    circleRectCollision,
    clamp,
    distance,
    distancePointToSegment,
    expandRect,
    nearestPointOnPolyline,
    nearestPointOnSegment,
    nearestPointOnSegments,
    obstacleCenter,
    obstacleVisualArea,
    pointInPolygon,
    rectsOverlap,
    smoothAngle,
  });
})(window);
