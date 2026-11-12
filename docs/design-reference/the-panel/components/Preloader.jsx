import Mark from './Mark.jsx';

// First-load screen: the mark sits dead centre while a thin counter follows real loading
// milestones (document parsed, fonts ready, every asset loaded). At 100% the counter lifts
// away and the mark flies into its slot in the header. Plain script, so it runs before React.
const BOOT_JS = `(function(){
var d=document,b=d.getElementById('boot'),logo=d.getElementById('bootLogo'),cnt=d.getElementById('bootCount'),pct=d.getElementById('bootPct');
if(!b||!logo||!cnt||!pct)return;
var target=0.08,shown=0,done=false,t0=Date.now();
function set(t){if(t>target)target=t;}
if(d.readyState!=='loading')set(0.4);else d.addEventListener('DOMContentLoaded',function(){set(0.4);});
if(d.fonts&&d.fonts.ready)d.fonts.ready.then(function(){set(0.75);});else set(0.75);
if(d.readyState==='complete')set(1);else window.addEventListener('load',function(){set(1);});
setTimeout(function(){set(1);},6000);
function finish(){
  cnt.classList.add('is-leaving');
  var slot=d.querySelector('.site-header .brand svg'),r=logo.getBoundingClientRect();
  if(slot){var s=slot.getBoundingClientRect();
    logo.style.transform='translate('+(s.left+s.width/2-(r.left+r.width/2))+'px,'+(s.top+s.height/2-(r.top+r.height/2))+'px) scale('+(s.width/r.width)+')';}
  b.classList.add('is-leaving');
  setTimeout(function(){b.classList.add('done');d.documentElement.setAttribute('data-loaded','1');window.dispatchEvent(new Event('panel:ready'));},1500);
}
function tick(){
  var minimum=Math.min(1,(Date.now()-t0)/1400);
  var goal=Math.min(target,minimum<1?Math.max(0.08,minimum):1);
  shown+=(goal-shown)*0.12; if(goal-shown<0.004)shown=goal;
  pct.textContent=Math.round(shown*100);
  if(shown>=1&&!done){done=true;finish();return;}
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
})();`;

export default function Preloader() {
  return (
    <>
      <div className="boot" id="boot" aria-hidden="true" suppressHydrationWarning>
        <div className="boot-logo" id="bootLogo" suppressHydrationWarning>
          <Mark size={58} />
        </div>
        <div className="boot-count" id="bootCount" suppressHydrationWarning>
          <span id="bootPct" suppressHydrationWarning>
            0
          </span>
          <span className="pct">%</span>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT_JS }} />
    </>
  );
}
