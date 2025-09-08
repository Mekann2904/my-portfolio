import { animate, waapi, utils, createTimer, stagger, text, createTimeline} from 'animejs';

const button = document.getElementById('run-demo');

if (button) {
  button.addEventListener('click', () => {
    const container = document.querySelector('.css-selector-demo');
    const containerW = container?.clientWidth;
    const movePx = containerW ? containerW * 0.8 : 0;

    animate('.css-selector-demo .el:nth-child(even)', {
      x: `${movePx}px`,
      duration: 1000,
      scale: 0.75,
      width:{
        to: "4rem",
      },
      height:{
        to: "4rem",
      },
      borderRadius:{
        to: "100%",
      },
      loop: 3,
      alternate: true,
    });
    // waapi.animate('.css-selector-demo .el:nth-child(even)', {
    //   transform: 'translateX(15rem) scale(1.25) skew(-45deg) rotate(1turn)',
    // });
  });
}



animate('input', {
  value: 1000, // animate the input "value" attribute
  alternate: true,
  modifier: utils.round(0),
});

const [ $time, $count ] = utils.$('.value');

// タイマーを作って開始
createTimer({
  duration: 1000,    // 1回ループの長さ（ms）
  loop: true,        // true = 無限ループ / 数値 = 回数 / false = 1回のみ
  frameRate: 30,     // onUpdate 呼び出し頻度（fps）
  onUpdate: self => {
    if ($time) $time.textContent = String(Math.floor(self.currentTime));
  },
  onLoop: self => {
    if ($count) $count.textContent = String(self._currentIteration);
  }
});

const { chars } = text.split('h2', { words: false, chars: true });

animate(chars, {
  // Property keyframes
  y: [
    { to: '-2.75rem', ease: 'outExpo', duration: 600 },
    { to: 0, ease: 'outBounce', duration: 800, delay: 100 }
  ],
  // Property specific parameters
  rotate: {
    from: '-1turn',
    delay: 0
  },
  delay: stagger(50),
  ease: 'inOutCirc',
  loopDelay: 1000,
  loop: true
});

animate('.square', {
  translateX: ['0rem', 0, 17, 17, 0, 0],
  translateY: ['0rem', -2.5, -2.5, 2.5, 2.5, 0],
  scale: [1, 1, .5, .5, 1, 1],
  rotate: { to: 360, ease: 'linear' },
  duration: 3000,
  ease: 'inOut', // ease applied between each keyframes if no ease defined
  playbackEase: 'ouIn(5)', // ease applied accross all keyframes
  loop: true,
});

const circleAnimation = animate('.circle', {
  x: '15rem'
});

const tl = createTimeline()
.sync(circleAnimation)
.add('.triangle', {
  x: '15rem',
  rotate: '1turn',
  duration: 500,
  alternate: true,
  loop: 2,
})
.add('.square2', {
  x: '15rem',
});
