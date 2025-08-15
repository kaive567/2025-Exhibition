let adultJellyVideo;
let youngJellyVideo;
let backgroundVideo;
let jellyfishList = [];

let obstacleImage;
let obstacles = [];
let obstacleCount = 3;

let decoImage;
let decorations = [];
const decoCount = 50; // 원하는 개수로 조절

let clickAudio;   // HTMLAudioElement

function preload() {
  backgroundVideo = createVideo("assets/Background.mp4");
  backgroundVideo.hide();

  adultJellyVideo = createVideo("assets/Adult_JellyFish.webm");
  adultJellyVideo.hide();

  youngJellyVideo = createVideo("assets/Young_JellyFish.webm");
  youngJellyVideo.hide();

  obstacleImage = loadImage("assets/Obstacle.png");
  
  const decoNames = ["decoration1.png", "decoration2.png", "decoration3.png", "decoration4.png", "decoration5.png"];
  decoImages = decoNames.map((name) =>
    loadImage("assets/" + name,
      () => {}, // 성공 콜백
      (err) => console.warn("[deco load fail]", name, err) // 실패 로그
    )
  );
}

function setup() {
  const canvas = createCanvas(650, 400);
  canvas.parent("canvas-container");
  noStroke();

  // 비디오 자동재생 가드 + 루프 (한 번만)
  for (const v of [backgroundVideo, adultJellyVideo, youngJellyVideo]) {
    if (!v) continue;
    v.volume(0);
    v.elt.muted = true;
    v.elt.setAttribute('playsinline', '');
    v.loop();
  }

  // ✅ 효과음(HTMLAudio) 준비 — 파일명에 공백 있으면 %20 또는 이름 변경 권장
  clickAudio = new Audio('assets/buttonsound.mp3'); 
  clickAudio.preload = 'auto';      // 브라우저에 미리 로드 힌트
  clickAudio.crossOrigin = 'anonymous'; // (안전빵) CORS 힌트

  // ====== 여기부터는 "초기 생성" (한 번만) ======
  // Adult 7 - 가로 균등 분포
  const adultCount = 7;
  for (let i = 0; i < adultCount; i++) {
    const sectionWidth = width / adultCount;
    const xPos = sectionWidth * i + sectionWidth / 2 + random(-sectionWidth / 3, sectionWidth / 3);
    const jelly = new JellyFish("adult");
    jelly.x = constrain(xPos, jelly.size, width - jelly.size);
    jelly.y = random(jelly.size, height / 2);
    jellyfishList.push(jelly);
  }

  // Young 5 - 자유 랜덤
  for (let i = 0; i < 5; i++) jellyfishList.push(new JellyFish("young"));

  // Deco 파츠
  for (let i = 0; i < decoCount; i++) decorations.push(new Decoration());

  // 장애물 3개 (상단 균등)
  const obsWidth = 100, obsHeight = 100;
  const yPos = height / 8;
  const spacing = 150;
  const centerX = width / 2;
  obstacles.push({ x: centerX - spacing, y: yPos, w: obsWidth, h: obsHeight });
  obstacles.push({ x: centerX,           y: yPos, w: obsWidth, h: obsHeight });
  obstacles.push({ x: centerX + spacing, y: yPos, w: obsWidth, h: obsHeight });

  // 버튼 리스너 (중복 바인딩 금지: p5 select().mousePressed()는 쓰지 않음)
  document.getElementById('left-btn') .addEventListener('click', () => onButton('left'));
  document.getElementById('right-btn').addEventListener('click', () => onButton('right'));
}

// 공통 클릭 핸들러: 파동 + 효과음만
function onButton(side) {
  // 파동
  triggerWave(side);

  // 효과음
  if (clickSound) {
    if (getAudioContext().state !== 'running') getAudioContext().resume();
    clickSound.stop();
    clickSound.play();
  }
}

function onButton(side) {
  triggerWave(side);
  playClick();
}

// 겹쳐 재생(연타)도 자연스럽게 들리도록 clone 해서 재생
function playClick() {
  if (!clickAudio) return;
  try {
    const s = clickAudio.cloneNode(); // 새 인스턴스
    s.volume = 0.6;                   // 볼륨
    // iOS 사파리 대비: 재생 실패 캐치
    const p = s.play();
    if (p && typeof p.catch === 'function') {
      p.catch(err => console.warn('audio play blocked:', err));
    }
  } catch (e) {
    console.warn('audio error:', e);
  }
}


function triggerWave(side) {
  let pushStrength = 12; // 🔹 힘 2배 증가
  let maxDist = width / 2;

  let waveCenter;
  if (side === "left") {
    waveCenter = createVector(width * 0.25, height);
  } else {
    waveCenter = createVector(width * 0.75, height);
  }

  for (let jelly of jellyfishList) {
    let jellyPos = createVector(jelly.x, jelly.y);
    let dir = p5.Vector.sub(jellyPos, waveCenter);
    let distFromCenter = dir.mag();

    if (distFromCenter < maxDist) {
      dir.normalize();

      // 🔹 감쇠 완화 + 랜덤 섞기
      let strength = pushStrength * (1 - (distFromCenter / maxDist) * 0.5);
      dir.mult(strength);
      dir.x += random(-0.5, 0.5); // 살짝 좌우 흔들림
      dir.y += random(-0.5, 0.5);

      jelly.vx += dir.x;
      jelly.vy += dir.y;
    }
  }

  // 🔹 데코 파츠에도 파동 전달 (조금 약하게)
  for (let d of decorations) {
    let p = createVector(d.x, d.y);
    let dir = p5.Vector.sub(p, waveCenter);
    let distFromCenter = dir.mag();
    if (distFromCenter < maxDist) {
      dir.normalize();
      let strength = (pushStrength * 0.7) * (1 - (distFromCenter / maxDist) * 0.6);
      dir.mult(strength);
      dir.x += random(-0.3, 0.3);
      dir.y += random(-0.3, 0.3);
      d.vx += dir.x;
      d.vy += dir.y;
    }
  }
}


function draw() {
  clear()
  // 1. 배경 영상 비율 맞추기
  imageMode(CENTER);

  let vidW = backgroundVideo.width;
  let vidH = backgroundVideo.height;
  let canvasRatio = width / height;
  let videoRatio = vidW / vidH;

  let drawW, drawH;
  if (videoRatio > canvasRatio) {
    // 영상이 더 넓을 때 → 높이 맞추고 좌우 잘림
    drawH = height;
    drawW = height * videoRatio;
  } else {
    // 영상이 더 좁을 때 → 너비 맞추고 상하 잘림
    drawW = width;
    drawH = width / videoRatio;
  }

  // 2. 캔버스 중앙에 영상 그리기 (이게 이전 프레임 지우는 역할도 함)
  image(backgroundVideo, width / 2, height / 2, drawW, drawH);

  for (let d of decorations) {
    d.update();
    d.display();
  }

  // 3. Jellyfish 그리기
  for (let jelly of jellyfishList) {
    jelly.update();
    jelly.display();
  }

  // 장애물 그리기
  for (let obs of obstacles) {
    imageMode(CENTER);
    image(obstacleImage, obs.x, obs.y, obs.w, obs.h);
  }
}

// y축 그라데이션 함수
function setGradient(x, y, w, h, c1, c2) {
  noFill();
  for (let i = y; i <= y + h; i++) {
    let inter = map(i, y, y + h, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x + w, i);
  }
}

class JellyFish {
  constructor(type, x = null, y = null, size = null) {
    this.type = type;
    this.image = (this.type === "adult") ? adultJellyVideo : youngJellyVideo;


    // 타입별 크기
    if (this.type === "adult") {
      this.size = size || random(80, 100);
    } else {
      this.size = size || random(60, 79);
    }

    this.x = x ?? random(this.size, width - this.size);
    this.y = y ?? random(this.size, height - this.size);
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;

    this.isHit = false;      // 🔹 피격 상태
    this.hitTimer = 0;       // 🔹 피격 유지 시간

    // Adult 전용 변수
    if (this.type === "adult") {
      this.gravity = 0.05;
      this.upwardDamping = 0.6;
      this.activityLevel = 1.0; // 시작 활동성
      this.activityDecay = 0.0005; // 점점 감소
      this.minActivity = 0.05; // 최소 활동성
      this.bounceStrength = -0.3; // 바닥 튀기기
    } else {
      // Young 전용 변수
      this.gravity = 0;
      this.upwardDamping = 1;
      this.pulseCount = 0; // 유영 횟수
      this.growthAmount = 2; // 성장량
    }

    this.pulseTimer = 0;
    this.pulseInterval = random(60, 120);
    this.lastAngle = random(TWO_PI);
    this.glowBaseColor = color(102, 204, 255);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    for (let obs of obstacles) {
    let distToObstacle = dist(
      this.x + this.size / 2, this.y + this.size / 2, 
      obs.x, obs.y
    );

    let minDist = (this.size / 2) + (obs.w / 2);

    if (distToObstacle < minDist) {
      // 🔹 피격 상태 진입
        this.isHit = true;
        this.hitTimer = 20; // 약 0.33초 유지

      // Adult가 부딪히면 Young으로 변환
      if (this.type === "adult") {
        this.transformToYoung();
        return; // 변환 후 아래 로직 실행 안 함
      }

      // 🔹 Young 충돌은 단순 반사
      let angle = atan2(
        (this.y + this.size / 2) - obs.y,
        (this.x + this.size / 2) - obs.x
      );
      let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = cos(angle) * speed;
      this.vy = sin(angle) * speed;
      let overlap = minDist - distToObstacle;
      this.x += cos(angle) * overlap;
      this.y += sin(angle) * overlap;
    }
  }

  // 🔹 피격 상태 타이머 감소
    if (this.hitTimer > 0) {
      this.hitTimer--;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }

    if (this.type === "adult") {
      // 중력 적용
      this.vy += this.gravity;

      // 활동성 감소
      this.activityLevel = max(this.minActivity, this.activityLevel - this.activityDecay);
      this.pulseInterval = lerp(60, 200, 1 - this.activityLevel);

      // 바닥 근처면 흐느적 모션만
      if (this.y >= height - this.size - 2) {
        this.y = height - this.size - 2;
        this.vy = 0;
        this.vx = sin(frameCount * 0.02) * 0.2;
        return; // 바닥에서는 Pulse 거의 없음
      }
    }

    // 경계 처리 (좌우)
    if (this.x <= 0) {
      this.vx *= -1;
      this.x = 0;
    } else if (this.x >= width - this.size) {
      this.vx *= -1;
      this.x = width - this.size;
    }

    // 경계 처리 (위/아래)
    if (this.y <= 0) {
      this.vy *= -1;
      this.y = 0;
    } else if (this.y >= height - this.size) {
      if (this.type === "adult") {
        this.vy *= this.bounceStrength;
      } else {
        this.vy *= -1;
      }
      this.y = height - this.size;
    }

    // 감속
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Pulse 타이머
    this.pulseTimer++;
    if (this.pulseTimer >= this.pulseInterval) {
      this.pulse();
      this.pulseTimer = 0;
    }

    // 회전 → Young만 이동 방향 따라 회전
    if (this.type === "young") {
      if (this.vx !== 0 || this.vy !== 0) {
        this.rotation = atan2(this.vy, this.vx);
      }
    }
  }

  pulse() {
    let angle, speed;

    if (this.type === "adult") {
      // Adult 모션
      if (this.y > height * 0.6) {
        angle = random(-PI / 2 - 0.2, -PI / 2 + 0.2);
      } else {
        angle = this.lastAngle + random(-PI / 6, PI / 6);
      }
      speed = random(2, 4) * this.activityLevel;
      if (sin(angle) < 0) {
        speed *= this.upwardDamping;
      }
    } else {
      // Young 활발 모션
      angle = this.lastAngle + random(-PI / 4, PI / 4);
      speed = random(2, 4);

      // 유영 횟수 증가
      this.pulseCount++;

      // 10회 이상부터 2회마다 크기 + Glow 색 변화
      if (this.pulseCount >= 10 && this.pulseCount % 2 === 0) {
        this.size = min(this.size + this.growthAmount, 79);

        // Glow 색상 점진 변화 (푸른빛 → 청록빛 → 보라빛)
        let progress = map(this.pulseCount, 10, 30, 0, 1);
        this.glowBaseColor = lerpColor(
          color(102, 204, 255), // 푸른빛
          color(180, 100, 255), // 보라빛
          constrain(progress, 0, 1)
        );
      }

      // 30회 달성 시 Adult로 변환
      if (this.pulseCount >= 30) {
        this.transformToAdult();
        return;
      }
    }

    this.vx += cos(angle) * speed;
    this.vy += sin(angle) * speed;
    this.lastAngle = angle;
  }


  transformToAdult() {
    let newAdult = new JellyFish(
      "adult",
      this.x,
      this.y,
      max(this.size, 80) // Adult 최소 크기 보장
    );
    let idx = jellyfishList.indexOf(this);
    if (idx !== -1) {
      jellyfishList[idx] = newAdult;
    }
  }

  transformToYoung() {
    let newYoung = new JellyFish(
      "young",
      this.x,
      this.y,
      min(this.size, 79) // Young 최대 크기 제한
    );
    newYoung.vx = this.vx;
    newYoung.vy = this.vy;
    newYoung.pulseCount = 0; // 새 Young은 초기화

    let idx = jellyfishList.indexOf(this);
    if (idx !== -1) {
      jellyfishList[idx] = newYoung;
    }
  }

  display() {
    push();
    translate(this.x + this.size / 2, this.y + this.size / 2);
    rotate(this.rotation);

    // Young만 Glow
    if (this.type === "young") {
      let glowStrength = map(this.pulseTimer, 0, this.pulseInterval, 120, 30);
      let glowColor = lerpColor(
        this.glowBaseColor,
        color(0, 205, 200),
        map(this.pulseTimer, 0, this.pulseInterval, 1, 0)
      );

      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = color(glowColor);

      noStroke();
      for (let i = 3; i > 0; i--) {
        fill(red(glowColor), green(glowColor), blue(glowColor), (glowStrength / i) * 0.6);
        ellipse(0, 0, this.size + i * 15, this.size + i * 15);
      }
      drawingContext.shadowBlur = 0;
    }


    // 🔹 피격 상태면 빨간색 반투명 덧칠
    if (this.isHit) {
      tint(255, 0, 0, 128); // R=255, G=0, B=0, Alpha=128(50%)
    } else {
      noTint();
    }

    // 이미지
    imageMode(CENTER);
    image(this.image, 0, 0, this.size, this.size);
    pop();
  }
}

class Decoration {
  constructor() {
    this.sprite = decoImages.length ? random(decoImages) : null;

    const baseSize = random(22, 48);
    this.size = baseSize;

    this.x = random(this.size, width - this.size);
    this.y = random(height * 0.45, height - this.size);
    this.vx = 0; this.vy = 0;

    this.gravity = 0.03;
    this.drag = 0.99;
    this.bounceFactorX = -0.5;
    this.bounceFactorY = -0.2;

    this.rotation = 0;
    this.rotDrag = 0.96;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx; this.y += this.vy;

    const depth = constrain(this.y / height, 0, 1); // 0(위)~1(아래)
    const g = lerp(this.gravity, this.gravity * 0.5, depth); // 바닥에서 50%로 약화
    this.vy += g;

    if (this.x <= 0) { this.x = 0; this.vx *= this.bounceFactorX; }
    else if (this.x >= width - this.size) { this.x = width - this.size; this.vx *= this.bounceFactorX; }
    if (this.y <= 0) { this.y = 0; this.vy *= -0.4; }
    else if (this.y >= height - this.size) { this.y = height - this.size; this.vy *= this.bounceFactorY; }

    this.vx *= this.drag; this.vy *= this.drag;

    const targetRot = atan2(this.vy, this.vx) * 0.2;
    this.rotation = this.rotation * this.rotDrag + targetRot * (1 - this.rotDrag);
  }

  display() {
    if (!this.sprite || !this.sprite.width) return; // 🔒 안전가드

    push();
    translate(this.x + this.size / 2, this.y + this.size / 2);
    rotate(this.rotation);
    imageMode(CENTER);
    image(this.sprite, 0, 0, this.size, this.size);
    pop();
  }
}

