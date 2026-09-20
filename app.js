// Ledger ships with deterministic demo fixtures, but a generated local report can
// inject real, normalized Codex usage through window.__LEDGER_DATA__ before this file.
const DEMO_TASKS = [
  { id:'task-0', name:'Build dashboard shell', project:'Sample App', model:'gpt-5.6-sol', weight:1.7, cache:.78, current:1.25, previous:.94 },
  { id:'task-1', name:'Refine onboarding flow', project:'Sample App', model:'gpt-5.6-terra', weight:1.15, cache:.84, current:1.35, previous:.92 },
  { id:'task-2', name:'Add keyboard navigation', project:'Sample App', model:'gpt-5.6-sol', weight:.82, cache:.76, current:1.2, previous:1 },
  { id:'task-3', name:'Draft a research brief', project:'Research Notebook', model:'gpt-5.6-sol', weight:.72, cache:.7, current:.78, previous:1.08 },
  { id:'task-4', name:'Summarize source material', project:'Research Notebook', model:'gpt-5.6-terra', weight:.92, cache:.66, current:.82, previous:1.12 },
  { id:'task-5', name:'Prepare a weekly digest', project:'Writing Studio', model:'gpt-5.6-luna', weight:.42, cache:.9, current:1.14, previous:1.04 },
  { id:'task-6', name:'Outline a long-form article', project:'Writing Studio', model:'gpt-5.6-sol', weight:1.22, cache:.81, current:1.1, previous:.98 },
  { id:'task-7', name:'Organize project notes', project:'Personal Tools', model:'gpt-5.6-luna', weight:.52, cache:.86, current:.9, previous:1.08 },
  { id:'task-8', name:'Compare model behavior', project:'Personal Tools', model:'gpt-6-astra', weight:1.42, cache:.74, current:1.3, previous:0, activeAfter:'2026-09-11' },
  { id:'task-9', name:'Refactor shared components', project:'Sample App', model:'gpt-5.6-terra', weight:2.75, cache:.61, current:1.7, previous:.64 },
  { id:'task-10', name:'Triage saved references', project:'Research Notebook', model:'gpt-5.6-luna', weight:.36, cache:.93, current:.7, previous:1.05 },
  { id:'task-11', name:'Review release checklist', project:'Personal Tools', model:'gpt-5.6-terra', weight:.58, cache:.82, current:.82, previous:1.1 },
  { id:'task-12', name:'Explore a reasoning problem', project:'Research Notebook', model:'gpt-6-astra', weight:1.1, cache:.58, current:1.15, previous:0, activeAfter:'2026-09-12' }
];
const CREDIT_RATES = {
  'gpt-6-astra':{ input:250,cached:25,output:1250 },
  'gpt-5.6-sol':{ input:100,cached:10,output:500 },
  'gpt-5.6-terra':{ input:50,cached:5,output:300 },
  'gpt-5.6-luna':{ input:5,cached:.5,output:30 }
};
const SPEED_BASELINES = {'gpt-6-astra':92,'gpt-5.6-sol':136,'gpt-5.6-terra':172,'gpt-5.6-luna':218};
const MODEL_COLORS = {'gpt-6-astra':'#d97706','gpt-5.6-sol':'#0071e3','gpt-5.6-terra':'#5e5ce6','gpt-5.6-luna':'#248a3d'};
const FALLBACK_MODEL_COLORS = ['#0071e3','#5e5ce6','#248a3d','#d97706','#0a84ff','#bf5af2','#32ade6','#ff375f'];
const DEFAULT_QUOTA = { five:{ used:73, elapsed:56, seconds:8072, source:'demo' }, week:{ used:18, elapsed:28, seconds:558000, source:'demo' } };
const QUOTA_STORAGE_KEY = 'codex-ledger:quota-snapshot:v1';
const EXTERNAL_PAYLOAD = window.__LEDGER_DATA__ && typeof window.__LEDGER_DATA__ === 'object' ? window.__LEDGER_DATA__ : null;
const IS_LIVE_REPORT = Boolean(EXTERNAL_PAYLOAD && Array.isArray(EXTERNAL_PAYLOAD.records));
let quotaSnapshot = IS_LIVE_REPORT && !EXTERNAL_PAYLOAD?.quota ? {
  five:{ used:null, elapsed:null, seconds:0, source:'unavailable' },
  week:{ used:null, elapsed:null, seconds:0, source:'unavailable' }
} : {
  five:{...DEFAULT_QUOTA.five},
  week:{...DEFAULT_QUOTA.week}
};
let quotaObservedAt = 0;
let quotaStarted = Date.now();
let quotaRefreshState = 'initial';

function buildDemoRecords(){
  let seed=1029;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const output=[];
  const fixtureStart=new Date('2026-07-20T00:00:00Z');
  const fixtureEnd=new Date('2026-09-17T00:00:00Z');
  for(let cursor=new Date(fixtureStart);cursor<=fixtureEnd;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const date=cursor.toISOString().slice(0,10);
    DEMO_TASKS.forEach((task,taskIndex)=>{
      if(task.activeAfter&&date<task.activeAfter)return;
      const scale=date>='2026-09-11'?task.current:date>='2026-09-04'?task.previous:.78+random()*.44;
      if(!scale||random()>Math.min(.82,.31*scale+.24))return;
      const turns=Math.max(2,Math.round((2+random()*5)*scale));
      for(let turn=0;turn<turns;turn+=1){
        const input=Math.round((22000+random()*78000)*task.weight*(.82+random()*.36));
        const cacheRate=Math.max(.38,Math.min(.96,task.cache+(random()-.5)*.18));
        const cached=Math.round(input*cacheRate);
        const outputFactor=task.id==='task-6'?2.2:task.id==='task-12'?1.65:1;
        const outputTokens=Math.round((420+random()*3200)*outputFactor*Math.sqrt(task.weight));
        const speed=SPEED_BASELINES[task.model]*(.82+random()*.36);
        output.push({
          id:`demo-${date}-${taskIndex}-${turn}`,date,
          time:`${String(9+Math.floor(turn/2)).padStart(2,'0')}:${turn%2?'35':'10'}`,
          taskId:task.id,task:task.name,project:task.project,model:task.model,
          input,cached,output:outputTokens,reasoning:Math.round(outputTokens*(.28+random()*.22)),
          durationSeconds:Math.max(.25,outputTokens/speed),speedOutput:outputTokens,total:input+outputTokens
        });
      }
    });
  }
  return output;
}
function normalizeRecord(row,index){
  const input=Math.max(0,Number(row.input)||0),cached=Math.max(0,Math.min(input,Number(row.cached)||0)),output=Math.max(0,Number(row.output)||0);
  return {
    id:String(row.id||`record-${index}`),
    date:String(row.date||'').slice(0,10),
    time:String(row.time||'00:00').slice(0,5),
    taskId:String(row.taskId||row.sessionId||`task-${index}`),
    task:String(row.task||'Untitled session'),
    project:String(row.project||'Unattributed'),
    model:String(row.model||'unknown'),
    input,cached,output,
    reasoning:Math.max(0,Number(row.reasoning)||0),
    durationSeconds:Math.max(0,Number(row.durationSeconds)||0),
    speedOutput:Math.max(0,Number(row.speedOutput)||0),
    total:Math.max(0,Number(row.total)||(input+output))
  };
}
const demoRecords=buildDemoRecords();
const records=IS_LIVE_REPORT?EXTERNAL_PAYLOAD.records.map(normalizeRecord).filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)):demoRecords;
const taskCatalog=[...new Map(records.map(row=>[row.taskId,{id:row.taskId,name:row.task,project:row.project,model:row.model}])).values()];
const PROJECTS=[...new Set(records.map(row=>row.project))].sort((a,b)=>a.localeCompare(b));
const MODELS=[...new Set(records.map(row=>row.model))].sort((a,b)=>a.localeCompare(b));
const localTodayISO=()=>{const now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000);return local.toISOString().slice(0,10);};
const anchorDate=IS_LIVE_REPORT?localTodayISO():(records.length?records.reduce((max,row)=>row.date>max?row.date:max,records[0].date):localTodayISO());
const shiftISO=(value,days)=>{const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
const initialStart=shiftISO(anchorDate,-6);
const initialEnd=anchorDate;
const state = { range:'7d',project:'all',task:'all',model:'all',start:initialStart,end:initialEnd,search:'',descending:true,page:0,leftMetric:'burn',language:'en',matrixExpanded:false };
let filteredRecords = [];
let previousRecords = [];
let currentMetrics = null;
let previousMetrics = null;
let currentDrivers = new Map();
let lastFocusedElement = null;
let toastTimer = null;

const $ = id => document.getElementById(id);
const COPY = {
  en:{vsPrevious:'vs previous period',newLabel:'New',allProjects:'All projects',allTasks:'All tasks',allModels:'All models',dayAverage:n=>`${n}-day selected-period average`,tasksTurns:(tasks,turns)=>`${tasks} tasks / ${turns} turns`,cached:v=>`${v} cached`,perDay:v=>`${v} / Day`,turnCount:n=>`${n} turns`,quotaFresh:'Observed quota snapshot · updated just now',quotaDemo:'Observed quota snapshot · demo data',quotaUnchanged:'Account quota snapshot unchanged · no live quota source returned',quotaUpdated:'Account quota snapshot updated',quotaNote:'Account quota cards update when a fresh quota snapshot is available.',modelNote:'Starting a new Codex task to run this skill does use the model selected for that task.',liveBadge:'Live snapshot',demoBadge:'Demo data',noData:'No data for the current filters.',noProjectData:'No project data for the current filters.',adjustFilters:'Adjust the filters to see results.',projects:n=>`${n} projects`,topShare:p=>`Top 3 account for ${p} of current usage.`,showing:(a,b,n)=>`Showing ${a}–${b} / ${n}`,notAvailable:'Unavailable',estimatedRate:(credits,relative)=>`Estimated ${credits} cr · rate weight ${relative}× Luna`,turnsOutput:(turns,output)=>`${turns} turns · ${output} output`,quotaFast:'Short-window pace is high',quotaBody:'The 5-hour window is ahead of elapsed time; weekly pacing remains normal. Quota snapshots are independent of the token filters below.',growthTitle:p=>`${p} usage increased`,growthBody:(change,model)=>`Up ${change}% from the previous period, led by ${model}.`,expensiveTitle:'High-usage task found',expensiveBody:(task,tokens,share)=>`“${task}” used ${tokens} tokens, ${share} of the current period.`,concentrationTitle:m=>`${m} usage is concentrated`,concentrationBody:share=>`This model accounts for ${share} of current-period tokens.`,cacheUp:'Cache efficiency improved',cacheDown:'Cache hit declined',cacheBody:(from,verb,to)=>`Cache Hit ${verb} from ${from} to ${to}.`,rose:'rose',fell:'fell',noAnomaly:'No notable usage anomalies in the current filters.',previousDay:'Previous period',compare:'Compare',invalidDates:'Start date cannot be later than end date',cachedInput:'Cached input',uncachedInput:'Uncached input',output:'Output',quotaIntensity:'Quota intensity',speedRanking:'Generation speed',driverTotal:n=>`Total usage is among the current top ${n}`,driverDuration:v=>`Cumulative generation time: ${v}`,driverCache:v=>`Cache hit is only ${v}`,driverOutput:'Output share is high for the current task set',driverTurn:x=>`Tokens per turn are ${x}× the current median`,driverAstra:'Astra has a higher estimated credit-rate weight',driverNormal:'No notable consumption driver was triggered',topCurrent:'Top 5 in the current period.',resetToast:'Reset to last 7 days · all projects and models',exportToast:'Exported dashboard image · PNG',exportSvgFallback:'Exported dashboard image · SVG',exporting:'Exporting…',exportError:'Image export failed · please try again',refreshing:'Refreshing…',refreshData:'Refresh data',refreshDone:n=>`Local refresh complete · ${n} records · no model quota used`,refreshDoneNoQuota:n=>`Local refresh complete · ${n} records · quota snapshot unchanged`,refreshDoneWithQuota:n=>`Local refresh complete · ${n} records · quota snapshot updated`,reduceMotion:'Reduce motion',restoreMotion:'Restore motion',totalTokens:'Total tokens',previous:'Previous',next:'Next',sortTokens:'Total tokens',matrixCompact:'Compact',matrixAll:'Show all',matrixCompactScope:(projects,models)=>`Top ${projects} projects · Top ${models} models`,matrixAllScope:(projects,models)=>`All ${projects} projects · ${models} models`,matrixEmpty:'No model × project usage for the current filters.',noUsage:'No usage'},
  zh:{vsPrevious:'较上一周期',newLabel:'新增',allProjects:'所有项目',allTasks:'所有任务',allModels:'所有模型',dayAverage:n=>`所选 ${n} 天日均`,tasksTurns:(tasks,turns)=>`${tasks} 个任务 / ${turns} 次调用`,cached:v=>`已缓存 ${v}`,perDay:v=>`${v} / 天`,turnCount:n=>`${n} 次调用`,quotaFresh:'额度快照 · 刚刚更新',quotaDemo:'额度快照 · 演示数据',quotaUnchanged:'账户额度快照未变化 · 未返回实时额度来源',quotaUpdated:'账户额度快照已更新',quotaNote:'有新的额度快照时，5 小时和周额度卡片会同步更新。',modelNote:'重新发起 Codex 任务运行此 Skill 时，会使用该任务当前选择的模型。',liveBadge:'实时快照',demoBadge:'演示数据',noData:'当前筛选条件下暂无任务数据。',noProjectData:'当前筛选条件下暂无项目数据。',adjustFilters:'调整筛选条件后再查看。',projects:n=>`${n} 个项目`,topShare:p=>`前 3 项占当前总量 ${p}。`,showing:(a,b,n)=>`显示 ${a}–${b} / ${n}`,notAvailable:'不可用',estimatedRate:(credits,relative)=>`估算 ${credits} cr · 费率权重 ${relative}× Luna`,turnsOutput:(turns,output)=>`${turns} 次调用 · ${output} 输出`,quotaFast:'短窗口使用较快',quotaBody:'当前 5h 窗口进度高于时间进度；每周窗口节奏仍正常。额度快照与下方 Token 筛选独立。',growthTitle:p=>`${p} 消耗增长明显`,growthBody:(change,model)=>`较上一周期增加 ${change}%，主要来自 ${model}。`,expensiveTitle:'发现高消耗任务',expensiveBody:(task,tokens,share)=>`“${task}”消耗 ${tokens} Tokens，占当前周期 ${share}。`,concentrationTitle:m=>`${m} 使用集中`,concentrationBody:share=>`该模型占当前周期 Token 的 ${share}。`,cacheUp:'缓存效率改善',cacheDown:'缓存命中下降',cacheBody:(from,verb,to)=>`缓存命中率从 ${from} ${verb}至 ${to}。`,rose:'提升',fell:'下降',noAnomaly:'当前没有明显异常消耗。',previousDay:'上一周期',compare:'对比',invalidDates:'开始日期不能晚于结束日期',cachedInput:'缓存输入',uncachedInput:'非缓存输入',output:'输出',quotaIntensity:'额度消耗强度',speedRanking:'生成速度排名',driverTotal:n=>`总量位于当前任务 Top ${n}`,driverDuration:v=>`累计生成时长 ${v}`,driverCache:v=>`缓存命中率仅 ${v}`,driverOutput:'输出占比位于当前任务高位',driverTurn:x=>`单轮 Token 约为中位数 ${x}×`,driverAstra:'Astra 的估算 Credit 费率权重较高',driverNormal:'当前筛选范围内未触发明显消耗特征',topCurrent:'当前周期前 5 项。',resetToast:'已恢复近 7 天 · 所有项目与模型',exportToast:'已导出看板图片 · PNG',exportSvgFallback:'已导出看板图片 · SVG',exporting:'导出中…',exportError:'图片导出失败 · 请重试',refreshing:'刷新中…',refreshData:'刷新数据',refreshDone:n=>`本地刷新完成 · ${n} 条记录 · 未消耗模型额度`,refreshDoneNoQuota:n=>`本地刷新完成 · ${n} 条记录 · 额度快照未变化`,refreshDoneWithQuota:n=>`本地刷新完成 · ${n} 条记录 · 额度快照已更新`,reduceMotion:'减少动态效果',restoreMotion:'恢复动态效果',totalTokens:'Token 总量',previous:'上一页',next:'下一页',sortTokens:'Token 总量',matrixCompact:'精简',matrixAll:'全部',matrixCompactScope:(projects,models)=>`Top ${projects} 项目 · Top ${models} 模型`,matrixAllScope:(projects,models)=>`全部 ${projects} 项目 · ${models} 模型`,matrixEmpty:'当前筛选范围内暂无模型 × 项目用量。',noUsage:'无用量'}
};
const t = (key,...args) => { const value=COPY[state.language][key]; return typeof value==='function'?value(...args):value; };
const sum = (rows,key) => rows.reduce((total,row) => total + (Number(row[key]) || 0),0);
const escapeHTML = value => String(value).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shortModel = model => String(model||'unknown').replace('gpt-','');
const truncateMiddle = (value,max=22) => { const text=String(value||''); if(text.length<=max)return text; const tail=Math.max(5,Math.floor(max*.32)),head=Math.max(6,max-tail-1); return `${text.slice(0,head)}…${text.slice(-tail)}`; };
const modelColor = model => MODEL_COLORS[model] || FALLBACK_MODEL_COLORS[Math.abs([...String(model)].reduce((n,c)=>n+c.charCodeAt(0),0))%FALLBACK_MODEL_COLORS.length];
const hasCreditRate = model => Boolean(CREDIT_RATES[model]);
const parseDate = value => new Date(`${value}T00:00:00Z`);
const shiftDate = (value,days) => { const date = parseDate(value); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); };
function dateRange(start,end) { const dates=[]; for(let cursor=parseDate(start); cursor<=parseDate(end)&&dates.length<366; cursor.setUTCDate(cursor.getUTCDate()+1)) dates.push(cursor.toISOString().slice(0,10)); return dates; }
function formatTokens(value) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1000) return Math.round(value).toLocaleString('en-US');
  const [divisor,suffix] = Math.abs(value) >= 1e9 ? [1e9,'B'] : Math.abs(value) >= 1e6 ? [1e6,'M'] : [1e3,'K'];
  return `${(value/divisor).toFixed(2).replace(/\.0+$|(?<=\.[0-9])0$/,'')}${suffix}`;
}
const formatNumber = value => Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '—';
const formatPercent = (value,digits=1) => Number.isFinite(value) ? `${value.toFixed(digits)}%` : '—';
function formatDuration(seconds) { if(!Number.isFinite(seconds)) return '—'; const mins=Math.round(seconds/60); if(mins<60) return `${mins}m`; return `${Math.floor(mins/60)}h ${mins%60}m`; }
function formatCountdown(seconds,long=false) { const safe=Math.max(0,Math.floor(seconds)); if(long){const d=Math.floor(safe/86400),h=Math.floor(safe%86400/3600); return `${d}d ${h}h`;} const h=Math.floor(safe/3600),m=Math.floor(safe%3600/60),s=safe%60; return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':'); }
function changeRate(current,previous) { if(previous===0) return current>0 ? 'new' : null; return (current-previous)/previous; }
function formatChange(change,suffix=t('vsPrevious')) { if(change==='new') return `<span class="change new">${t('newLabel')}</span>`; if(!Number.isFinite(change)) return '<span class="change neutral">—</span>'; const arrow=change>0?'↑':change<0?'↓':'→'; return `<span class="change ${change>0?'up':change<0?'down':'neutral'}">${arrow} ${Math.abs(change*100).toFixed(1)}% ${suffix}</span>`; }

function rangeBounds() {
  if(state.range==='today') return [anchorDate,anchorDate];
  if(state.range==='30d') return [shiftDate(anchorDate,-29),anchorDate];
  if(state.range==='custom') return [state.start,state.end];
  return [shiftDate(anchorDate,-6),anchorDate];
}
function calculatePreviousPeriod([start,end]) {
  if(start>end) return [start,end];
  const days=dateRange(start,end).length;
  return [shiftDate(start,-days),shiftDate(start,-1)];
}
function filterUsageData(bounds) {
  const [start,end]=bounds;
  if(start>end) return [];
  return records.filter(row => row.date>=start && row.date<=end &&
    (state.project==='all'||row.project===state.project) &&
    (state.task==='all'||row.taskId===state.task) &&
    (state.model==='all'||row.model===state.model));
}
function creditsForRecord(row) { const rate=CREDIT_RATES[row.model]; if(!rate) return 0; return ((row.input-row.cached)*rate.input+row.cached*rate.cached+row.output*rate.output)/1e6; }
function aggregateTasks(rows) {
  const grouped=new Map();
  rows.forEach(row=>{
    if(!grouped.has(row.taskId)) grouped.set(row.taskId,{taskId:row.taskId,task:row.task,project:row.project,model:row.model,input:0,cached:0,output:0,reasoning:0,total:0,durationSeconds:0,measuredOutput:0,credits:0,count:0});
    const item=grouped.get(row.taskId); ['input','cached','output','reasoning','total'].forEach(key=>item[key]+=row[key]); item.count+=1; item.credits+=creditsForRecord(row);
    if(row.durationSeconds>0){item.durationSeconds+=row.durationSeconds;item.measuredOutput+=(row.speedOutput||row.output);}
  });
  return [...grouped.values()].map(item=>({...item,speed:item.durationSeconds?item.measuredOutput/item.durationSeconds:null,cacheRate:item.input?item.cached/item.input:0,tokensPerTurn:item.count?item.total/item.count:null}));
}
function aggregateModels(rows) {
  const grouped=new Map();
  rows.forEach(row=>{
    if(!grouped.has(row.model)) grouped.set(row.model,{model:row.model,input:0,cached:0,output:0,total:0,durationSeconds:0,measuredOutput:0,credits:0,calls:0,taskIds:new Set()});
    const item=grouped.get(row.model); ['input','cached','output','total'].forEach(key=>item[key]+=row[key]); item.calls+=1; item.credits+=creditsForRecord(row); item.taskIds.add(row.taskId); item.durationSeconds+=row.durationSeconds; item.measuredOutput+=row.durationSeconds>0?(row.speedOutput||row.output):0;
  });
  return [...grouped.values()].map(item=>({...item,tasks:item.taskIds.size,speed:item.durationSeconds?item.measuredOutput/item.durationSeconds:null,cacheRate:item.input?item.cached/item.input:0,tokensPerTask:item.taskIds.size?item.total/item.taskIds.size:null}));
}
function calculateMetrics(rows,bounds) {
  const tasks=aggregateTasks(rows),input=sum(rows,'input'),cached=sum(rows,'cached'),total=sum(rows,'total'),days=bounds[0]<=bounds[1]?dateRange(...bounds).length:0;
  return {rows,tasks,models:aggregateModels(rows),total,input,cached,output:sum(rows,'output'),uncached:input-cached,cacheRate:input?cached/input:null,burnRate:days?total/days:null,tokensPerTask:tasks.length?total/tasks.length:null,taskCount:tasks.length,calls:rows.length,days};
}
const percentile = (values,p) => { if(!values.length)return 0; const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]; };
function calculateTaskDrivers(tasks) {
  const driverLabel=label=>state.language==='zh'?({
    'Large Task':'高消耗任务','Long Session':'长时任务','Low Cache':'低缓存命中','Output Heavy':'输出偏高','High Token / Turn':'单轮 Token 偏高','Model Intensive':'高强度模型','Normal':'正常'
  }[label]||label):label;
  const result=new Map(),p90Total=percentile(tasks.map(t=>t.total),.9),p90Turn=percentile(tasks.map(t=>t.tokensPerTurn||0),.9),p90Duration=percentile(tasks.map(t=>t.durationSeconds),.9),medianTurn=percentile(tasks.map(t=>t.tokensPerTurn||0),.5),p90Output=percentile(tasks.map(t=>t.output/t.total),.9);
  tasks.forEach(task=>{
    const labels=[],reasons=[];
    if(task.total>=p90Total&&tasks.length>2){labels.push(driverLabel('Large Task'));reasons.push(t('driverTotal',tasks.length<10?'3':'10%'));}
    if(task.durationSeconds>=p90Duration&&tasks.length>2){labels.push(driverLabel('Long Session'));reasons.push(t('driverDuration',formatDuration(task.durationSeconds)));}
    if(task.cacheRate<.65){labels.push(driverLabel('Low Cache'));reasons.push(t('driverCache',formatPercent(task.cacheRate*100)));}
    if(task.output/task.total>=p90Output&&tasks.length>2){labels.push(driverLabel('Output Heavy'));reasons.push(t('driverOutput'));}
    if(task.tokensPerTurn>=p90Turn&&tasks.length>2){labels.push(driverLabel('High Token / Turn'));reasons.push(t('driverTurn',(task.tokensPerTurn/Math.max(medianTurn,1)).toFixed(1)));}
    if(task.model==='gpt-6-astra'){labels.push(driverLabel('Model Intensive'));reasons.push(t('driverAstra'));}
    result.set(task.taskId,{labels:labels.length?labels.slice(0,3):[driverLabel('Normal')],reasons:reasons.length?reasons.slice(0,3):[t('driverNormal')]});
  });
  return result;
}

function normalizeQuotaWindow(value,fallback){
  const hasUsed=value?.used!==null&&value?.used!==undefined&&Number.isFinite(Number(value.used));
  const hasElapsed=value?.elapsed!==null&&value?.elapsed!==undefined&&Number.isFinite(Number(value.elapsed));
  const used=hasUsed?Number(value.used):null, seconds=Number(value?.seconds), elapsed=hasElapsed?Number(value.elapsed):null;
  const resetRaw=value?.resetsAt;
  const resetMs=typeof resetRaw==='number'?(resetRaw<1e12?resetRaw*1000:resetRaw):Date.parse(resetRaw||'');
  const liveSeconds=Number.isFinite(resetMs)?Math.max(0,Math.floor((resetMs-Date.now())/1000)):seconds;
  return {
    ...fallback,
    ...(value||{}),
    used:used!==null?Math.max(0,Math.min(100,used)):fallback.used,
    seconds:Number.isFinite(liveSeconds)?liveSeconds:fallback.seconds,
    elapsed:elapsed!==null?Math.max(0,Math.min(100,elapsed)):fallback.elapsed,
    source:value?.source||fallback.source||'unknown'
  };
}
function snapshotTime(value){
  const raw=value?.observedAt;
  const parsed=typeof raw==='number'?(raw<1e12?raw*1000:raw):Date.parse(raw||'');
  return Number.isFinite(parsed)?parsed:0;
}
function readStoredQuota(){
  try{
    const stored=window.localStorage?.getItem(QUOTA_STORAGE_KEY);
    return stored?JSON.parse(stored):null;
  }catch(error){ return null; }
}
function persistQuotaSnapshot(value,observedAt){
  try{
    window.localStorage?.setItem(QUOTA_STORAGE_KEY,JSON.stringify({
      observedAt:new Date(observedAt||Date.now()).toISOString(),
      source:value.source||'live',
      five:value.five,
      week:value.week
    }));
  }catch(error){ /* Private browsing or file storage can be unavailable. */ }
}
function loadQuotaScriptSync(){
  try{
    const request=new XMLHttpRequest();
    request.open('GET',`quota-snapshot.local.js?sync=${Date.now()}`,false);
    request.send(null);
    const ok=(request.status>=200&&request.status<300)||request.status===0;
    if(!ok||!request.responseText)return false;
    new Function(request.responseText)();
    return applyQuotaSnapshot(window.__CODEX_QUOTA_SNAPSHOT__);
  }catch(error){ return false; }
}
function applyQuotaSnapshot(value,options={}){
  if(!value||typeof value!=='object'||(!value.five&&!value.week)) return false;
  const observedAt=snapshotTime(value)||Date.now();
  if(!options.force&&quotaObservedAt&&observedAt<quotaObservedAt)return false;
  const next={
    five:normalizeQuotaWindow(value.five,quotaSnapshot.five),
    week:normalizeQuotaWindow(value.week,quotaSnapshot.week)
  };
  const unchanged=quotaObservedAt===observedAt&&next.five.used===quotaSnapshot.five.used&&next.week.used===quotaSnapshot.week.used&&next.five.resetsAt===quotaSnapshot.five.resetsAt&&next.week.resetsAt===quotaSnapshot.week.resetsAt;
  quotaSnapshot=next;
  quotaObservedAt=observedAt;
  quotaRefreshState='updated';
  quotaStarted=Date.now();
  if(options.persist!==false)persistQuotaSnapshot(value,observedAt);
  return !unchanged;
}
async function loadQuotaSidecar(){
  const scriptUpdated=await new Promise(resolve=>{
    const script=document.createElement('script');
    script.async=true;
    script.src=`quota-snapshot.local.js?ts=${Date.now()}`;
    script.onload=()=>resolve(applyQuotaSnapshot(window.__CODEX_QUOTA_SNAPSHOT__));
    script.onerror=()=>resolve(false);
    document.head.appendChild(script);
    window.setTimeout(()=>resolve(false),3000);
  });
  if(scriptUpdated)return true;
  try{
    const response=await fetch(`quota-snapshot.local.json?ts=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)return false;
    return applyQuotaSnapshot(await response.json());
  }catch(error){
    return loadQuotaScriptSync();
  }
}
function quotaPacingInsight(){
  const five=quotaSnapshot.five,week=quotaSnapshot.week,zh=state.language==='zh';
  const available=item=>item&&item.used!==null&&item.used!==undefined&&Number.isFinite(Number(item.used));
  if(!available(five)&&!available(week)) return {tone:'neutral',title:zh?'额度快照不可用':'Quota snapshot unavailable',body:zh?'本地 Token 记录不能推算官方 5 小时或每周额度；等待 Codex 日志中出现可观测的 rate-limit 快照。':'Local token records cannot infer official 5-hour or weekly quota. Ledger will use a recorded rate-limit snapshot when Codex persists one.'};
  const delta=item=>available(item)&&Number.isFinite(Number(item.elapsed))?Number(item.used)-Number(item.elapsed):null;
  const fiveDelta=delta(five),weekDelta=delta(week);
  if((fiveDelta!==null&&fiveDelta>10)||(weekDelta!==null&&weekDelta>10)) return {tone:'warning',title:zh?'当前额度消耗偏快':'Usage pace is ahead',body:zh?'至少一个额度窗口的已使用比例明显高于时间进度；建议关注重置前的剩余额度。':'At least one quota window is materially ahead of elapsed time. Keep an eye on the remaining allowance before reset.'};
  if((fiveDelta!==null&&fiveDelta<-10)&&(weekDelta===null||weekDelta<=5)) return {tone:'green',title:zh?'当前额度节奏正常':'Usage pace looks healthy',body:zh?'当前已使用比例没有领先于时间进度，暂未看到明显的额度节奏风险。':'Observed usage is not running ahead of elapsed time, so there is no obvious pacing risk right now.'};
  return {tone:'neutral',title:zh?'额度节奏接近时间进度':'Usage pace is near elapsed time',body:zh?'当前额度使用与时间进度大致接近；继续结合剩余额度和重置时间观察。':'Observed quota usage is roughly tracking elapsed time. Use the remaining allowance and reset time as the primary guide.'};
}
function renderQuota(){
  const zh=state.language==='zh', five=quotaSnapshot.five, week=quotaSnapshot.week;
  const available=item=>item&&item.used!==null&&item.used!==undefined&&Number.isFinite(Number(item.used))&&item.source!=='unavailable';
  const update=(prefix,item,windowLabel)=>{
    const meter=$(prefix+'-meter');
    if(!available(item)){
      $(prefix+'-used').textContent='—';
      $(prefix+'-usage-copy').textContent=zh?'未观测到官方额度快照':'Official quota snapshot not observed';
      meter.removeAttribute('aria-valuenow');meter.querySelector('i').style.setProperty('--quota','0');
      $(prefix+'-countdown').textContent='—';
      return;
    }
    const used=Math.round(Number(item.used)), left=Math.max(0,100-used);
    $(prefix+'-used').textContent=String(used); $(prefix+'-usage-copy').textContent=zh?`已使用 ${used}% · 剩余 ${left}%`:`${used}% used · ${left}% left`;
    meter.setAttribute('aria-label',zh?`${windowLabel}已使用 ${used}%`:`${windowLabel} ${used}% used`); meter.setAttribute('aria-valuenow',String(used)); meter.querySelector('i').style.setProperty('--quota',String(used/100));
  };
  update('five',five,zh?'五小时额度':'Five-hour quota'); update('week',week,zh?'每周额度':'Weekly quota');
  const live=five.source==='live'||week.source==='live';
  const source=quotaRefreshState==='unchanged'?t('quotaUnchanged'):(live?t('quotaFresh'):(IS_LIVE_REPORT?(zh?'本地用量已载入 · 官方额度快照不可用':'Local usage loaded · official quota snapshot unavailable'):t('quotaDemo')));
  $('quota-source').textContent=source;
  $('mode-badge').textContent=(live||IS_LIVE_REPORT)?t('liveBadge'):t('demoBadge');
  const pacing=quotaPacingInsight();
  const advice=$('.quota-advice');
  if(advice){advice.classList.toggle('healthy',pacing.tone==='green');const strong=advice.querySelector('strong'),body=advice.querySelector('p');if(strong)strong.textContent=pacing.title;if(body)body.textContent=pacing.body;}
  const fiveEstimate=$('five-estimate-copy'),weekEstimate=$('week-estimate-copy');
  if(fiveEstimate)fiveEstimate.textContent=available(five)?(zh?'基于已观测窗口进度，不由 Token 总量反推':'Based on the observed window; never inferred from token totals'):(zh?'等待可观测额度快照':'Waiting for an observed quota snapshot');
  if(weekEstimate)weekEstimate.textContent=available(week)?(zh?'基于已观测窗口进度，不由 Token 总量反推':'Based on the observed window; never inferred from token totals'):(zh?'等待可观测额度快照':'Waiting for an observed quota snapshot');
}

function syncRangeControls(){document.querySelectorAll('[data-range]').forEach(button=>{const active=button.dataset.range===state.range;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});$('custom-range').classList.toggle('visible',state.range==='custom');}
function applyStaticLanguage(){
  const zh=state.language==='zh'; document.documentElement.lang=zh?'zh-CN':'en'; document.title=zh?'Ledger · Codex 用量分析':'Ledger · Codex usage analytics';
  const bindings=[
    ['.nav-item[data-target="overview"] span','Overview','总览'],['.nav-item[data-target="models"] span','Models','模型'],['.nav-item[data-target="attribution"] span','Attribution','归因'],
    ['.privacy-status>span','Processed locally','仅在本机处理'],['.privacy-note p','No conversations, prompts, or API keys are uploaded.','不上传对话、提示词或 API 密钥。'],['.breadcrumb>span','Workspace','工作空间'],['#breadcrumb-current','Usage overview','用量总览'],['#mode-badge','Demo data','演示数据'],['#export-button span','Export','导出视图'],['#refresh-button span','Refresh data','刷新数据'],
    ['.refresh-eyebrow','Refresh engine','刷新引擎'],['.refresh-popover>strong','Local parser · No model','本地解析器 · 不调用模型'],['.refresh-popover>p','Refresh re-reads local usage logs and recalculates the dashboard. It does not call a model or use Codex quota.','刷新会重新读取本地用量日志并计算看板，不会调用模型，也不会消耗 Codex 额度。'],['#refresh-quota-note','Account quota cards update when a fresh quota snapshot is available.','有新的额度快照时，5 小时和周额度卡片会同步更新。'],['#refresh-model-note','Starting a new Codex task to run this skill does use the model selected for that task.','重新发起 Codex 任务运行此 Skill 时，会使用该任务当前选择的模型。'],
    ['#page-title','Usage, at a glance.','用量，一眼清楚。'],['.hero>div>p','See where your Codex usage goes, from account quota to individual model calls.','从账户额度到每一次模型调用，找到消耗发生的位置和原因。'],['.snapshot-status>span','Static snapshot','静态快照'],
    ['.quota-five .quota-top span','5-hour window','5 小时窗口'],['.quota-five .quota-top small','Account-wide · Observed','账户全局 · Observed'],['.quota-five .quota-bottom>span:first-child','73% used · 27% left','已使用 73% · 剩余 27%'],['#five-reset-label','Reset in ','重置倒计时 '],['#five-estimate-copy','At this pace, the short window may hit its limit before reset','按当前节奏，短窗口可能在重置前触顶'],
    ['.quota-week .quota-top span','Weekly window','每周窗口'],['.quota-week .quota-top small','Account-wide · Observed','账户全局 · Observed'],['.quota-week .quota-bottom>span:first-child','18% used · 82% left','已使用 18% · 剩余 82%'],['#week-reset-label','Reset in ','重置倒计时 '],['#week-estimate-copy','Projected to use 64% by the end of this cycle','按当前速度预计本周期使用 64%'],
    ['.quota-advice strong','Short-window pace is high','短窗口使用较快'],['.quota-advice p','The 5-hour window is ahead of elapsed time; weekly pacing remains normal. Quota snapshots are independent of the token filters below.','当前 5h 使用进度高于时间进度；每周窗口节奏仍正常。额度来自账户快照，与下方 Token 筛选独立。'],
    ['[data-range="today"]','Today','今天'],['[data-range="7d"]','Last 7 days','近 7 天'],['[data-range="30d"]','Last 30 days','近 30 天'],['[data-range="custom"]','Custom','自定义'],['.custom-range span','to','至'],['#reset-filters','Reset','重置'],['.filter-context small','Local time · Local observations','本地时间 · 本地观测'],
    ['.kpi-rail>div:nth-child(1)>span','Total Tokens · Observed','Token 总量 · Observed'],['.kpi-rail>div:nth-child(2)>span','Burn Rate · Calculated','消耗速率 · Calculated'],['.kpi-rail>div:nth-child(3)>span','Tokens / Task · Calculated','单任务 Token · Calculated'],['.kpi-rail>div:nth-child(4)>span','Cache Hit · Calculated','缓存命中 · Calculated'],
    ['#insights-title','Usage insights','使用洞察'],['.insights-panel .section-head p','Generated from transparent rules using the current filters. Up to four insights.','由当前筛选数据按透明规则生成，最多显示 4 条。'],['.insights-panel .scope-label','Calculated · Current period','Calculated · 当前周期'],
    ['#model-title','Model quota intensity & token usage','模型额度消耗与 Token 使用'],['.model-section-head>div:first-child p','Compare estimated quota intensity or generation speed on the left, observed token volume on the right.','左侧对比估算额度强度或生成速度；右侧对比可观测 Token 总量。'],['.formula-chip span','Intensity metric','强度口径'],['.formula-chip strong','Estimated credits ÷ model turns','估算 Credits ÷ 模型调用次数'],['.speed-panel .rank-title>div>span','Quota & performance','额度与性能'],['[data-left-metric="burn"]','Quota intensity','额度强度'],['[data-left-metric="speed"]','Generation speed','生成速度'],['.volume-panel .rank-title>div>span','Usage','消耗'],['#volume-title','Token volume','总量排名'],
    ['#intensity-footnote','Quota intensity is shown only when a built-in rate mapping is available','仅在存在内置费率映射时显示额度强度估算'],['#speed-footnote','Generation speed is output token/s; durations are synthetic in this demo','生成速度为输出 token/s；当前持续时间为合成数据'],
    ['.trend-panel h2','Token timeline','Token 时间线'],['.trend-panel .section-head p','Hover to compare the matching day in the previous period; click to drill down.','悬停查看上一周期对应日；点击日期下钻。'],['#legend-cached','Cached input','缓存输入'],['#legend-uncached','Uncached input','非缓存输入'],['#legend-output','Output','输出'],['.chart-caption span:last-child','Input + output = total','输入 + 输出 = 总量'],
    ['.composition-panel h2','Token composition','Token 构成'],['.composition-panel .section-head p','Current filter range','当前筛选范围'],['.panel-note','Reasoning tokens are a subset of output and are not counted twice.','推理 Token 是输出的子集，不重复计入总量。'],
    ['.matrix-panel h2','Model × project','模型 × 项目'],['.matrix-panel .section-head p','Darker cells indicate more concentrated token usage.','颜色越深，Token 消耗越集中。'],['.matrix-panel .scope-label','Current period · All projects','当前时间范围 · 所有项目'],['.outlier-panel h2','Task efficiency map','任务效率分布'],['.outlier-panel .section-head p','Total tokens × cache hit rate; only high-usage outliers are labelled.','总量 × 缓存命中率；只标注高消耗离群任务。'],['.outlier-panel .scope-label','Point area = turns','点面积 = Turns'],
    ['.projects-panel h2','Project distribution','项目分布'],['.projects-panel .section-head p','Click a project to filter every detail.','点击项目联动全部明细。'],['.expensive-panel h2','Top expensive tasks','高消耗任务'],['.expensive-panel .scope-label','Calculated · Click for drivers','Calculated · 点击查看原因'],['#task-details-title','Task details','任务明细'],['.tasks-panel .section-head p','Open any task to inspect its consumption drivers and turns.','点击任意任务查看消耗特征与逐次调用。'],
    ['th:nth-child(1)','Task / Project','任务 / 项目'],['th:nth-child(2)','Model','模型'],['th:nth-child(4)','Tokens / Turn','单轮 Token'],['th:nth-child(5)','Output speed','输出速率'],['th:nth-child(6)','Cache','缓存命中'],['th:nth-child(7)','Driver','消耗特征'],['#previous-page','Previous','上一页'],['#next-page','Next','下一页'],
    ['.page-footer>span','Ledger · Independent community tool','Ledger · 独立社区工具'],['.page-footer div>span','Local records ≠ complete account billing','本地记录 ≠ 账户全量账单']
  ];
  bindings.forEach(([selector,en,cn])=>{const element=document.querySelector(selector);if(element)element.textContent=zh?cn:en;});
  const snapshotStatus=document.querySelector('.snapshot-status>span'),refreshStrong=document.querySelector('.refresh-popover>strong'),refreshBody=document.querySelector('.refresh-popover>p');
  if(snapshotStatus)snapshotStatus.textContent=!IS_LIVE_REPORT?(zh?'演示快照':'Demo snapshot'):(typeof window.ledgerRefreshAdapter==='function'?(zh?'实时本地数据':'Live local data'):(zh?'静态本地快照':'Static local snapshot'));
  if(!IS_LIVE_REPORT){
    if(refreshStrong)refreshStrong.textContent=zh?'演示预览':'Demo preview';
    if(refreshBody)refreshBody.textContent=zh?'当前页面使用合成演示数据。要读取并刷新你本机的 Codex 数据，请运行 python3 scripts/ledger.py --open。':'This page uses synthetic demo data. To read and refresh your local Codex data, run python3 scripts/ledger.py --open.';
  }else if(typeof window.ledgerRefreshAdapter!=='function'){
    if(refreshStrong)refreshStrong.textContent=zh?'静态本地快照':'Static local snapshot';
    if(refreshBody)refreshBody.textContent=zh?'当前快照不会从浏览器直接重新读取本机日志。请用 --open 或 --serve 启动 Ledger，即可启用实时刷新。':'This static snapshot cannot rescan local logs from the browser. Start Ledger with --open or --serve to enable live refresh.';
  }
  const ariaBindings=[
    ['.sidebar','Primary navigation','主导航'],['.brand','Ledger home','Ledger 首页'],['.language-switch','Language','语言'],
    ['.quota-layout','Account quota snapshot','账户额度快照'],['.quota-five .quota-meter','Five-hour quota 73% used','五小时额度已使用 73%'],['.quota-week .quota-meter','Weekly quota 18% used','每周额度已使用 18%'],
    ['.filter-dock','Data filters','数据筛选'],['.segmented','Time range','时间范围'],['#start-date','Start date','开始日期'],['#end-date','End date','结束日期'],['.kpi-rail','Current range summary','当前范围摘要'],
    ['.metric-switch','Ranking metric','排名指标'],['.analytics-grid','Timeline and composition','时间趋势与构成'],['#timeline-chart','Daily stacked token usage chart','按日 Token 消耗堆叠柱状图'],
    ['.diagnostics-grid','Cross-analysis and task outliers','交叉分析与异常任务'],['#outlier-chart','Task token volume and cache-hit scatter plot','任务 Token 总量与缓存命中率散点图'],['.attribution-grid','Usage attribution','消耗归因'],['.tasks-panel','Task details','任务明细']
  ];
  ariaBindings.forEach(([selector,en,cn])=>{const element=document.querySelector(selector);if(element)element.setAttribute('aria-label',zh?cn:en);});
  $('task-search').placeholder=zh?'搜索任务或模型':'Search tasks or models'; $('task-search').setAttribute('aria-label',$('task-search').placeholder); $('theme-toggle').setAttribute('aria-label',zh?'切换明暗主题':'Toggle theme'); $('export-button').setAttribute('aria-label',zh?'导出看板图片':'Export dashboard image'); $('export-button').title=zh?'导出看板图片':'Export dashboard image'; $('refresh-button').setAttribute('aria-label',zh?'刷新数据':'Refresh data'); $('refresh-info').setAttribute('aria-label',zh?'刷新如何工作':'How refresh works'); $('drawer-close').setAttribute('aria-label',zh?'关闭详情':'Close details'); $('project-filter').setAttribute('aria-label',zh?'筛选项目':'Filter by project'); $('task-filter').setAttribute('aria-label',zh?'筛选任务':'Filter by task'); $('model-filter').setAttribute('aria-label',zh?'筛选模型':'Filter by model'); $('previous-page').setAttribute('aria-label',zh?'上一页':'Previous page'); $('next-page').setAttribute('aria-label',zh?'下一页':'Next page'); const matrixGroup=document.querySelector('.matrix-view-switch'); if(matrixGroup)matrixGroup.setAttribute('aria-label',zh?'矩阵显示范围':'Matrix view');
  $('project-filter').options[0].textContent=t('allProjects'); $('model-filter').options[0].textContent=t('allModels'); $('motion-toggle').textContent=document.body.classList.contains('reduce-motion')?t('restoreMotion'):t('reduceMotion'); renderQuota();
  document.querySelectorAll('[data-language]').forEach(button=>{const active=button.dataset.language===state.language;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}
function populateTaskOptions(){const select=$('task-filter'),previous=state.task;select.innerHTML=`<option value="all">${t('allTasks')}</option>`;const visibleIds=new Set(records.filter(row=>(state.project==='all'||row.project===state.project)&&(state.model==='all'||row.model===state.model)).map(row=>row.taskId));taskCatalog.filter(task=>visibleIds.has(task.id)).sort((a,b)=>a.name.localeCompare(b.name)).forEach(task=>select.add(new Option(task.name,task.id)));state.task=[...select.options].some(option=>option.value===previous)?previous:'all';select.value=state.task;}

function renderSummary(){
  const totalChange=changeRate(currentMetrics.total,previousMetrics.total),burnChange=changeRate(currentMetrics.burnRate||0,previousMetrics.burnRate||0),taskChange=changeRate(currentMetrics.tokensPerTask||0,previousMetrics.tokensPerTask||0),cacheChange=changeRate(currentMetrics.cacheRate||0,previousMetrics.cacheRate||0);
  $('total-tokens').textContent=formatTokens(currentMetrics.total); $('total-detail').innerHTML=`${formatChange(totalChange)} · ${formatNumber(currentMetrics.total)} tokens`;
  $('burn-rate').textContent=currentMetrics.burnRate?t('perDay',formatTokens(currentMetrics.burnRate)):'—'; $('burn-detail').innerHTML=`${formatChange(burnChange)} · ${t('dayAverage',currentMetrics.days)}`;
  $('tokens-task').textContent=currentMetrics.tokensPerTask?formatTokens(currentMetrics.tokensPerTask):'—'; $('tokens-task-detail').innerHTML=`${formatChange(taskChange)} · ${t('tasksTurns',currentMetrics.taskCount,currentMetrics.calls)}`;
  $('cache-rate').textContent=currentMetrics.cacheRate!==null?formatPercent(currentMetrics.cacheRate*100):'—'; $('cache-detail').innerHTML=`${formatChange(cacheChange)} · ${t('cached',formatTokens(currentMetrics.cached))}`;
  const [start,end]=rangeBounds(),task=taskCatalog.find(item=>item.id===state.task);
  $('filter-summary').textContent=`${start.replaceAll('-','.')} — ${end.replaceAll('-','.')} · ${state.project==='all'?t('allProjects'):state.project}${state.model==='all'?'':` · ${shortModel(state.model)}`}${task?` · ${task.name}`:''}`;
}

function calculateInsights(){
  const eyebrow=state.language==='zh'?{quota:'额度 / 节奏',growth:'项目增长',task:'高消耗任务',model:'模型集中度',cache:'缓存'}:{quota:'Quota / Pacing',growth:'Project Growth',task:'Expensive Task',model:'Model Concentration',cache:'Cache'};
  const insights=[];
  const pacing=quotaPacingInsight(); if(quotaSnapshot.five.source!=='unavailable'||quotaSnapshot.week.source!=='unavailable')insights.push({tone:pacing.tone,eyebrow:eyebrow.quota,title:pacing.title,body:pacing.body});
  const projects=PROJECTS.map(project=>{const current=sum(filteredRecords.filter(r=>r.project===project),'total'),previous=sum(previousRecords.filter(r=>r.project===project),'total');return{project,current,previous,change:changeRate(current,previous)};}).filter(item=>item.current>0);
  const growth=projects.filter(item=>Number.isFinite(item.change)&&item.change>.25).sort((a,b)=>b.change-a.change)[0];
  if(growth){const rows=filteredRecords.filter(r=>r.project===growth.project),top=aggregateModels(rows).sort((a,b)=>b.total-a.total)[0];insights.push({tone:'orange',eyebrow:eyebrow.growth,title:t('growthTitle',growth.project),body:t('growthBody',(growth.change*100).toFixed(1),shortModel(top.model))});}
  const top=[...currentMetrics.tasks].sort((a,b)=>b.total-a.total)[0];
  if(top&&currentMetrics.total&&top.total/currentMetrics.total>.11) insights.push({tone:'blue',eyebrow:eyebrow.task,title:t('expensiveTitle'),body:t('expensiveBody',top.task,formatTokens(top.total),formatPercent(top.total/currentMetrics.total*100))});
  const model=[...currentMetrics.models].sort((a,b)=>b.total-a.total)[0];
  if(model&&currentMetrics.total&&model.total/currentMetrics.total>.32) insights.push({tone:'neutral',eyebrow:eyebrow.model,title:t('concentrationTitle',shortModel(model.model)),body:t('concentrationBody',formatPercent(model.total/currentMetrics.total*100))});
  if(currentMetrics.cacheRate!==null&&previousMetrics.cacheRate!==null&&Math.abs(currentMetrics.cacheRate-previousMetrics.cacheRate)>.035){const up=currentMetrics.cacheRate>previousMetrics.cacheRate;insights.push({tone:up?'green':'neutral',eyebrow:eyebrow.cache,title:t(up?'cacheUp':'cacheDown'),body:t('cacheBody',formatPercent(previousMetrics.cacheRate*100),t(up?'rose':'fell'),formatPercent(currentMetrics.cacheRate*100))});}
  return insights.slice(0,4);
}
function renderInsights(){const items=calculateInsights();$('usage-insights').innerHTML=items.length?items.map(item=>`<article class="usage-insight ${item.tone}"><span>${item.eyebrow}</span><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.body)}</p></article>`).join(''):`<div class="empty-state">${t('noAnomaly')}</div>`;}

function rankRows(items,type,maxValue,grandTotal,previousMap){
  if(!items.length)return `<div class="rank-empty">${t('noData')}</div>`;
  return items.map((item,index)=>{
    const isBurn=type==='burn',isSpeed=type==='speed'; const value=isBurn?(item.calls?item.credits/item.calls:0):isSpeed?item.speed:item.total; const width=maxValue?value/maxValue:0; const previous=previousMap.get(item.model); const change=changeRate(item.total,previous?previous.total:0); let valueText,detail;
    if(isBurn){const rate=CREDIT_RATES[item.model],base=CREDIT_RATES['gpt-5.6-luna'];if(rate&&base){const relative=rate.output/base.output;valueText=`${value.toFixed(2)}<small> cr/turn</small>`;detail=t('estimatedRate',item.credits.toFixed(1),relative.toFixed(1));}else{valueText=`—<small> rate</small>`;detail=state.language==='zh'?'当前模型暂无费率映射':'No rate mapping for this model';}}
    else if(isSpeed){valueText=`${item.speed.toFixed(1)}<small> token/s</small>`;detail=t('turnsOutput',item.calls,formatTokens(item.output));}
    else {valueText=`${formatTokens(item.total)}<small> tokens</small>`;detail=`${grandTotal?formatPercent(item.total/grandTotal*100):'0%'} · ${formatChange(change,'')}`;}
    return `<div class="rank-row"><div class="rank-meta"><span class="rank-index">${String(index+1).padStart(2,'0')}</span><span class="rank-model">${escapeHTML(shortModel(item.model))}</span><strong class="rank-value">${valueText}</strong></div><div class="rank-bar"><i style="--bar:${width};--delay:${index*55}ms"></i></div><div class="rank-detail">${detail}${isBurn||isSpeed?` · ${formatChange(change,'')}`:''}</div></div>`;
  }).join('');
}
function renderModels(){
  const models=currentMetrics.models,previousMap=new Map(previousMetrics.models.map(item=>[item.model,item])),grandTotal=currentMetrics.total;
  const byBurn=[...models].filter(m=>hasCreditRate(m.model)).sort((a,b)=>(b.calls?b.credits/b.calls:0)-(a.calls?a.credits/a.calls:0)),byCredits=[...models].filter(m=>hasCreditRate(m.model)).sort((a,b)=>b.credits-a.credits),bySpeed=[...models].filter(m=>m.speed!==null).sort((a,b)=>b.speed-a.speed),byVolume=[...models].sort((a,b)=>b.total-a.total),byCache=[...models].filter(m=>m.input).sort((a,b)=>b.cacheRate-a.cacheRate);
  const labels=state.language==='zh'?['单次额度强度最高','估算额度总量最高','输出生成最快','缓存效率最高']:['Highest per-turn intensity','Highest estimated credits','Fastest generation','Highest cache hit'];
  const cards=[[labels[0],byBurn[0],byBurn[0]?`${(byBurn[0].credits/byBurn[0].calls).toFixed(2)} cr/turn`:''],[labels[1],byCredits[0],byCredits[0]?`${byCredits[0].credits.toFixed(1)} cr`:''],[labels[2],bySpeed[0],bySpeed[0]?`${bySpeed[0].speed.toFixed(1)} token/s`:''],[labels[3],byCache[0],byCache[0]?formatPercent(byCache[0].cacheRate*100):'']];
  $('model-insights').innerHTML=cards.map(([label,item,detail])=>`<div class="insight-item"><span>${label}</span><strong>${item?escapeHTML(shortModel(item.model)):'—'}<b>${detail}</b></strong></div>`).join('');
  const left=state.leftMetric==='burn'?byBurn:bySpeed,maxLeft=Math.max(...left.map(item=>state.leftMetric==='burn'?item.credits/item.calls:item.speed),1);
  $('left-ranking').innerHTML=rankRows(left,state.leftMetric,maxLeft,grandTotal,previousMap); $('volume-ranking').innerHTML=rankRows(byVolume,'volume',Math.max(...byVolume.map(i=>i.total),1),grandTotal,previousMap); $('left-rank-title').textContent=state.leftMetric==='burn'?t('quotaIntensity'):t('speedRanking');
  document.querySelectorAll('[data-left-metric]').forEach(button=>{const active=button.dataset.leftMetric===state.leftMetric;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}

function renderTimeline(){
  const bounds=rangeBounds(),previousBounds=calculatePreviousPeriod(bounds),dates=bounds[0]<=bounds[1]?dateRange(...bounds):[],previousDates=previousBounds[0]<=previousBounds[1]?dateRange(...previousBounds):[];
  const values=dates.map((date,index)=>{const rows=filteredRecords.filter(r=>r.date===date),input=sum(rows,'input'),output=sum(rows,'output'),cached=sum(rows,'cached'),previous=sum(previousRecords.filter(r=>r.date===previousDates[index]),'total');return{date,cached,uncached:input-cached,output,total:input+output,previous,previousDate:previousDates[index]};});
  const max=Math.max(...values.map(v=>v.total),1)*1.12,left=54,right=806,baseline=222,height=185,step=(right-left)/Math.max(values.length,1),barWidth=Math.min(48,step*.58); let svg='';
  for(let i=0;i<4;i+=1){const y=baseline-i*height/3;svg+=`<line class="chart-grid" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text class="chart-axis" x="42" y="${y+3}" text-anchor="end">${formatTokens(max*i/3)}</text>`;}
  if(!filteredRecords.length)svg+=`<text class="chart-axis" x="430" y="126" text-anchor="middle">${t('noData')}</text>`;
  values.forEach((value,index)=>{const x=left+step*(index+.5)-barWidth/2;let y=baseline;svg+=`<g class="timeline-group" data-date="${value.date}" tabindex="0" role="button">`;[['cached','#0a84ff'],['uncached','#64d2ff'],['output','#ff9f0a']].forEach(([key,color],stack)=>{const h=value[key]/max*height;y-=h;svg+=`<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(0,h)}" fill="${color}" rx="${stack===2?2:0}"/>`;});svg+=`<rect x="${x-5}" y="${baseline-height-8}" width="${barWidth+10}" height="${height+12}" fill="transparent"/></g>`;if(values.length<=8||index%Math.ceil(values.length/7)===0||index===values.length-1)svg+=`<text class="chart-axis" x="${x+barWidth/2}" y="248" text-anchor="middle">${value.date.slice(5).replace('-','/')}</text>`;});
  $('timeline-chart').innerHTML=svg;$('timeline-range').textContent=bounds[0]>bounds[1]?t('invalidDates'):`${bounds[0].slice(5)} — ${bounds[1].slice(5)} · ${t('compare')} ${previousBounds[0].slice(5)} — ${previousBounds[1].slice(5)}`;
  $('timeline-chart').querySelectorAll('[data-date]').forEach(element=>{const value=values.find(v=>v.date===element.dataset.date);const select=()=>{state.range='custom';state.start=value.date;state.end=value.date;state.page=0;$('start-date').value=value.date;$('end-date').value=value.date;syncRangeControls();render();};element.addEventListener('click',select);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});element.addEventListener('pointermove',event=>{const frame=element.closest('.chart-frame').getBoundingClientRect(),change=changeRate(value.total,value.previous),tooltip=$('timeline-tooltip');tooltip.innerHTML=`${value.date}<br><strong>${formatTokens(value.total)}</strong> tokens<br><span>${t('previousDay')} ${value.previousDate} · ${formatTokens(value.previous)}</span><br>${formatChange(change,'')}`;tooltip.style.display='block';tooltip.style.left=`${Math.min(event.clientX-frame.left+12,frame.width-205)}px`;tooltip.style.top=`${Math.max(0,event.clientY-frame.top-86)}px`;});element.addEventListener('pointerleave',()=>{$('timeline-tooltip').style.display='none';});});
}
function renderComposition(){const {input,cached,output,total}=currentMetrics,parts=[[t('cachedInput'),cached,'#0a84ff'],[t('uncachedInput'),input-cached,'#64d2ff'],[t('output'),output,'#ff9f0a']];$('composition-total').innerHTML=`${formatTokens(total)}<small>tokens</small>`;$('composition-track').innerHTML=parts.map(p=>`<i style="width:${total?p[1]/total*100:0}%;background:${p[2]}"></i>`).join('');$('composition-list').innerHTML=parts.map(p=>`<div class="composition-row"><i style="background:${p[2]}"></i><span>${p[0]}</span><strong>${formatTokens(p[1])}<small>${total?formatPercent(p[1]/total*100):'0%'}</small></strong></div>`).join('');}
function renderHeatmap(){
  const projectTotals=new Map(),modelTotals=new Map(),pairTotals=new Map();
  filteredRecords.forEach(row=>{
    projectTotals.set(row.project,(projectTotals.get(row.project)||0)+row.total);
    modelTotals.set(row.model,(modelTotals.get(row.model)||0)+row.total);
    const key=`${row.project}\u0000${row.model}`;
    pairTotals.set(key,(pairTotals.get(key)||0)+row.total);
  });
  const allProjects=[...projectTotals.entries()].filter(([,total])=>total>0).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
  const allModels=[...modelTotals.entries()].filter(([,total])=>total>0).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
  const projects=state.matrixExpanded?allProjects:allProjects.slice(0,6);
  const models=state.matrixExpanded?allModels:allModels.slice(0,5);
  const container=$('model-project-heatmap'),scroll=$('heatmap-scroll'),compactButton=$('matrix-compact'),allButton=$('matrix-all');
  compactButton.textContent=t('matrixCompact');allButton.textContent=t('matrixAll');
  compactButton.classList.toggle('active',!state.matrixExpanded);allButton.classList.toggle('active',state.matrixExpanded);
  compactButton.setAttribute('aria-pressed',String(!state.matrixExpanded));allButton.setAttribute('aria-pressed',String(state.matrixExpanded));
  scroll.classList.toggle('expanded',state.matrixExpanded);
  $('matrix-scope').textContent=state.matrixExpanded?t('matrixAllScope',allProjects.length,allModels.length):t('matrixCompactScope',projects.length,models.length);
  if(!projects.length||!models.length){container.removeAttribute('style');container.innerHTML=`<div class="matrix-empty">${t('matrixEmpty')}</div>`;return;}
  const max=Math.max(...projects.flatMap(project=>models.map(model=>pairTotals.get(`${project}\u0000${model}`)||0)),1);
  const labelWidth=state.matrixExpanded?156:142,cellMin=state.matrixExpanded?94:78,minWidth=labelWidth+models.length*cellMin+(models.length*6);
  container.style.setProperty('--matrix-cols',models.length);container.style.setProperty('--matrix-label-width',`${labelWidth}px`);container.style.setProperty('--matrix-cell-min',`${cellMin}px`);container.style.minWidth=`${Math.max(520,minWidth)}px`;
  let html='<div class="heatmap-corner" aria-hidden="true"></div>';
  models.forEach(model=>html+=`<div class="heatmap-label heatmap-column" title="${escapeHTML(model)}">${escapeHTML(truncateMiddle(shortModel(model),18))}</div>`);
  projects.forEach(project=>{
    html+=`<div class="heatmap-label heatmap-row" title="${escapeHTML(project)}">${escapeHTML(truncateMiddle(project,22))}</div>`;
    models.forEach(model=>{
      const total=pairTotals.get(`${project}\u0000${model}`)||0,intensity=total?12+total/max*68:0,title=`${project} · ${model} · ${formatNumber(total)} tokens`;
      html+=total?`<button class="heat-cell" data-project="${escapeHTML(project)}" data-model="${escapeHTML(model)}" style="background:color-mix(in srgb,var(--blue) ${intensity.toFixed(1)}%,var(--surface-soft))" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}">${formatTokens(total)}</button>`:`<span class="heat-cell is-empty" title="${escapeHTML(project)} · ${escapeHTML(model)} · ${t('noUsage')}" aria-label="${escapeHTML(project)} · ${escapeHTML(model)} · ${t('noUsage')}"></span>`;
    });
  });
  container.innerHTML=html;
  container.querySelectorAll('button[data-project][data-model]').forEach(button=>button.addEventListener('click',()=>{state.project=button.dataset.project;state.model=button.dataset.model;state.task='all';state.page=0;$('project-filter').value=state.project;$('model-filter').value=state.model;populateTaskOptions();render();}));
}

function renderOutliers(tasks){
  const max=Math.max(...tasks.map(t=>t.total),1)*1.08,left=44,right=500,top=24,bottom=212,width=right-left,height=bottom-top,minCache=.4,maxCache=1;let svg='';
  for(let i=0;i<4;i+=1){const x=left+i*width/3;svg+=`<line class="chart-grid" x1="${x}" x2="${x}" y1="${top}" y2="${bottom}"/><text class="outlier-axis" x="${x}" y="235" text-anchor="middle">${formatTokens(max*i/3)}</text>`;}[.5,.7,.9].forEach(rate=>{const y=bottom-(rate-minCache)/(maxCache-minCache)*height;svg+=`<line class="chart-grid" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text class="outlier-axis" x="36" y="${y+3}" text-anchor="end">${Math.round(rate*100)}%</text>`;});
  if(!tasks.length)svg+=`<text class="outlier-axis" x="270" y="125" text-anchor="middle">${t('noData')}</text>`;
  const threshold=percentile(tasks.map(t=>t.total),.9),labeled=tasks.filter(t=>t.total>=threshold).sort((a,b)=>b.total-a.total).slice(0,3).map(t=>t.taskId);
  tasks.forEach(task=>{const x=left+task.total/max*width,y=bottom-Math.max(0,Math.min(1,(task.cacheRate-minCache)/(maxCache-minCache)))*height,radius=Math.min(12,4+Math.sqrt(task.count)*.75);svg+=`<g class="outlier-point" data-task="${task.taskId}" tabindex="0" role="button"><circle style="fill:${modelColor(task.model)}99;stroke:${modelColor(task.model)}" cx="${x}" cy="${y}" r="${radius}"/></g>`;if(labeled.includes(task.taskId)){const placeLeft=x>410,labelX=placeLeft?x-radius-5:x+radius+5,labelY=Math.max(top+10,Math.min(bottom-4,y+3));svg+=`<text class="outlier-label" x="${labelX}" y="${labelY}" text-anchor="${placeLeft?'end':'start'}">${escapeHTML(truncateMiddle(task.task,16))}</text>`;}});$('outlier-chart').innerHTML=svg;
  $('outlier-chart').querySelectorAll('[data-task]').forEach(element=>{const task=tasks.find(t=>t.taskId===element.dataset.task),open=()=>openTask(task.taskId);element.addEventListener('click',open);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});element.addEventListener('pointermove',event=>{const frame=$('outlier-chart').closest('.outlier-frame').getBoundingClientRect(),tip=$('outlier-tooltip'),leftPos=Math.min(event.clientX-frame.left+12,frame.width-272),topPos=Math.max(8,Math.min(event.clientY-frame.top-108,frame.height-126));tip.innerHTML=`<div class="task-tooltip-title">${escapeHTML(task.task)}</div><div class="task-tooltip-meta">${escapeHTML(task.project)} · ${escapeHTML(shortModel(task.model))}</div><div class="task-tooltip-grid"><span>Tokens <strong>${formatTokens(task.total)}</strong></span><span>/ turn <strong>${formatTokens(task.tokensPerTurn)}</strong></span><span>Cache <strong>${formatPercent(task.cacheRate*100)}</strong></span><span>Turns <strong>${task.count}</strong></span></div>`;tip.style.display='block';tip.style.left=`${Math.max(8,leftPos)}px`;tip.style.top=`${topPos}px`;});element.addEventListener('pointerleave',()=>{$('outlier-tooltip').style.display='none';});});
}
function renderProjects(){
  const previousMap=new Map(PROJECTS.map(project=>[project,sum(previousRecords.filter(r=>r.project===project),'total')]));
  const values=PROJECTS
    .map(project=>({project,total:sum(filteredRecords.filter(r=>r.project===project),'total')}))
    .filter(item=>item.total>0)
    .sort((a,b)=>b.total-a.total);
  const grand=values.reduce((total,item)=>total+item.total,0);
  const formatProjectShare=value=>value>0&&value<.1?'<0.1%':formatPercent(value);
  $('project-count').textContent=t('projects',values.length);
  $('project-list').innerHTML=values.length?values.map(item=>{
    const change=changeRate(item.total,previousMap.get(item.project)||0),share=grand?item.total/grand*100:0;
    return `<button class="project-item ${state.project===item.project?'selected':''}" data-project="${escapeHTML(item.project)}" title="${escapeHTML(item.project)}"><div class="project-line"><span class="project-name">${escapeHTML(item.project)}</span><strong class="project-value">${formatTokens(item.total)}</strong></div><div class="project-sub"><span>${formatProjectShare(share)}</span>${formatChange(change,'')}</div><div class="project-meter"><i style="--share:${grand?item.total/grand:0}"></i></div></button>`;
  }).join(''):`<div class="empty-state">${t('noProjectData')}</div>`;
  $('project-list').querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{state.project=state.project===button.dataset.project?'all':button.dataset.project;state.task='all';state.page=0;$('project-filter').value=state.project;populateTaskOptions();render();}));
}
function renderTopTasks(tasks){const top=[...tasks].sort((a,b)=>b.total-a.total).slice(0,5),topThree=sum(top.slice(0,3),'total');$('top-task-summary').textContent=top.length?t('topShare',formatPercent(currentMetrics.total?topThree/currentMetrics.total*100:0)):t('noData');$('top-expensive-tasks').innerHTML=top.length?top.map((task,index)=>`<button class="expensive-item" data-task="${task.taskId}" title="${escapeHTML(task.task)} · ${escapeHTML(task.project)} · ${escapeHTML(task.model)}"><span class="expensive-index">${String(index+1).padStart(2,'0')}</span><span class="expensive-copy"><strong>${escapeHTML(task.task)}</strong><small><span class="expensive-project">${escapeHTML(task.project)}</span><span class="expensive-model">· ${escapeHTML(shortModel(task.model))}</span></small></span><span class="expensive-value"><strong>${formatTokens(task.total)}</strong><small>${formatPercent(currentMetrics.total?task.total/currentMetrics.total*100:0)}</small></span></button>`).join(''):`<div class="empty-state">${t('adjustFilters')}</div>`;$('top-expensive-tasks').querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',()=>openTask(button.dataset.task)));}
function renderTaskTable(tasks){const query=state.search.trim().toLowerCase(),matching=tasks.filter(task=>`${task.task} ${task.project} ${task.model}`.toLowerCase().includes(query)).sort((a,b)=>state.descending?b.total-a.total:a.total-b.total),pageSize=8,pages=Math.max(1,Math.ceil(matching.length/pageSize));state.page=Math.min(state.page,pages-1);const visible=matching.slice(state.page*pageSize,state.page*pageSize+pageSize);$('task-count').textContent=`/ ${matching.length}`;$('task-table-body').innerHTML=visible.length?visible.map(task=>{const driver=currentDrivers.get(task.taskId)||{labels:['Normal']};return `<tr><td><button class="task-link" data-task="${task.taskId}" title="${escapeHTML(task.task)}">${escapeHTML(task.task)}</button><span class="task-project" title="${escapeHTML(task.project)}">${escapeHTML(task.project)} · ${t('turnCount',task.count)}</span></td><td><span class="model-tag" title="${escapeHTML(task.model)}">${escapeHTML(shortModel(task.model))}</span></td><td class="numeric-cell"><span class="rank-value">${formatTokens(task.total)}</span></td><td class="numeric-cell">${formatTokens(task.tokensPerTurn)}</td><td class="speed-value numeric-cell">${task.speed?`${task.speed.toFixed(1)}/s`:t('notAvailable')}</td><td class="numeric-cell">${formatPercent(task.cacheRate*100,0)}</td><td><span class="driver-tag" title="${escapeHTML(driver.labels.join(', '))}">${escapeHTML(driver.labels[0])}</span></td></tr>`;}).join(''):`<tr><td colspan="7" class="table-empty">${t('noData')}</td></tr>`;$('table-status').textContent=t('showing',matching.length?state.page*pageSize+1:0,Math.min((state.page+1)*pageSize,matching.length),matching.length);$('page-number').textContent=`${state.page+1} / ${pages}`;$('previous-page').disabled=state.page===0;$('next-page').disabled=state.page>=pages-1;$('task-table-body').querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',()=>openTask(button.dataset.task)));}

function openTask(taskId){const rows=filteredRecords.filter(r=>r.taskId===taskId),task=aggregateTasks(rows)[0];if(!task)return;lastFocusedElement=document.activeElement;const zh=state.language==='zh',driver=currentDrivers.get(taskId)||{labels:['Normal'],reasons:[t('driverNormal')]},ui=zh?{detail:'任务详情',total:'Token 总量',turns:'轮次',perTurn:'单轮 Token',duration:'生成时长',cache:'缓存命中',speed:'输出速度',driver:'消耗特征',breakdown:'Token 构成',input:'输入',cached:'缓存输入',uncached:'非缓存输入',output:'输出',calls:'逐次调用',note:hasCreditRate(task.model)?`Estimated Credits：${task.credits.toFixed(1)} cr。仅用于模型费率权重比较，不代表账户额度百分比。`:'Estimated Credits：当前模型无内置费率映射，因此不估算。'}:{detail:'Task detail',total:'Total tokens',turns:'Turns',perTurn:'Tokens / turn',duration:'Generation duration',cache:'Cache hit',speed:'Output speed',driver:'Consumption driver',breakdown:'Token breakdown',input:'Input',cached:'Cached input',uncached:'Non-cached input',output:'Output',calls:'Individual turns',note:hasCreditRate(task.model)?`Estimated credits: ${task.credits.toFixed(1)} cr. This is only a model-rate weighting and is not an account quota percentage.`:'Estimated credits are unavailable because this model has no built-in rate mapping.'};$('drawer-content').innerHTML=`<span class="drawer-label">${ui.detail} · Observed / Calculated</span><h2 id="drawer-title">${escapeHTML(task.task)}</h2><p class="drawer-subtitle">${escapeHTML(task.project)} · ${escapeHTML(task.model)}</p><div class="drawer-metrics"><div class="drawer-metric"><span>${ui.total}</span><strong>${formatTokens(task.total)}</strong></div><div class="drawer-metric"><span>${ui.turns}</span><strong>${task.count}</strong></div><div class="drawer-metric"><span>${ui.perTurn}</span><strong>${formatTokens(task.tokensPerTurn)}</strong></div><div class="drawer-metric"><span>${ui.duration}</span><strong>${formatDuration(task.durationSeconds)}</strong></div><div class="drawer-metric"><span>${ui.cache}</span><strong>${formatPercent(task.cacheRate*100)}</strong></div><div class="drawer-metric"><span>${ui.speed}</span><strong>${task.speed?`${task.speed.toFixed(1)} t/s`:'—'}</strong></div></div><h3>${ui.driver}</h3><div class="driver-list">${driver.labels.map(label=>`<span class="driver-tag">${escapeHTML(label)}</span>`).join('')}</div><ul class="driver-reasons">${driver.reasons.map(reason=>`<li>${escapeHTML(reason)}</li>`).join('')}</ul><h3>${ui.breakdown}</h3><div class="breakdown-list"><span>${ui.input} <b>${formatTokens(task.input)}</b></span><span>${ui.cached} <b>${formatTokens(task.cached)}</b></span><span>${ui.uncached} <b>${formatTokens(task.input-task.cached)}</b></span><span>${ui.output} <b>${formatTokens(task.output)}</b></span></div><p class="drawer-note">${ui.note}</p><h3>${ui.calls}</h3>${rows.slice().reverse().slice(0,30).map(row=>`<div class="call-row"><span>${row.date.slice(5)} ${row.time}</span><strong>${formatTokens(row.total)} tok</strong><em>${row.durationSeconds?`${((row.speedOutput||row.output)/row.durationSeconds).toFixed(1)}/s`:'—'}</em></div>`).join('')}`;$('drawer-backdrop').classList.add('open');document.body.style.overflow='hidden';$('drawer-close').focus();}
function closeDrawer(){$('drawer-backdrop').classList.remove('open');document.body.style.overflow='';if(lastFocusedElement)lastFocusedElement.focus();}
function showToast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200);}

function render(){const bounds=rangeBounds(),previousBounds=calculatePreviousPeriod(bounds);filteredRecords=filterUsageData(bounds);previousRecords=filterUsageData(previousBounds);currentMetrics=calculateMetrics(filteredRecords,bounds);previousMetrics=calculateMetrics(previousRecords,previousBounds);currentDrivers=calculateTaskDrivers(currentMetrics.tasks);renderQuota();renderSummary();renderInsights();renderModels();renderTimeline();renderComposition();renderHeatmap();renderOutliers(currentMetrics.tasks);renderProjects();renderTopTasks(currentMetrics.tasks);renderTaskTable(currentMetrics.tasks);}

PROJECTS.forEach(project=>$('project-filter').add(new Option(project,project)));MODELS.forEach(model=>$('model-filter').add(new Option(shortModel(model),model)));applyStaticLanguage();populateTaskOptions();syncRangeControls();
document.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{state.range=button.dataset.range;state.page=0;syncRangeControls();render();}));
document.querySelectorAll('[data-left-metric]').forEach(button=>button.addEventListener('click',()=>{state.leftMetric=button.dataset.leftMetric;renderModels();}));
$('matrix-compact').addEventListener('click',()=>{if(!state.matrixExpanded)return;state.matrixExpanded=false;renderHeatmap();});
$('matrix-all').addEventListener('click',()=>{if(state.matrixExpanded)return;state.matrixExpanded=true;renderHeatmap();});
$('project-filter').addEventListener('change',event=>{state.project=event.target.value;state.task='all';state.page=0;populateTaskOptions();render();});
$('model-filter').addEventListener('change',event=>{state.model=event.target.value;state.task='all';state.page=0;populateTaskOptions();render();});
$('task-filter').addEventListener('change',event=>{state.task=event.target.value;state.page=0;render();});
$('start-date').addEventListener('change',event=>{state.start=event.target.value;state.page=0;render();});$('end-date').addEventListener('change',event=>{state.end=event.target.value;state.page=0;render();});
$('task-search').addEventListener('input',event=>{state.search=event.target.value;state.page=0;renderTaskTable(currentMetrics.tasks);});
$('sort-tasks').addEventListener('click',()=>{state.descending=!state.descending;$('sort-tasks').textContent=`${t('sortTokens')} ${state.descending?'↓':'↑'}`;renderTaskTable(currentMetrics.tasks);});
$('previous-page').addEventListener('click',()=>{state.page-=1;renderTaskTable(currentMetrics.tasks);});$('next-page').addEventListener('click',()=>{state.page+=1;renderTaskTable(currentMetrics.tasks);});
$('reset-filters').addEventListener('click',()=>{Object.assign(state,{range:'7d',project:'all',task:'all',model:'all',start:initialStart,end:initialEnd,search:'',page:0,matrixExpanded:false});$('project-filter').value='all';$('model-filter').value='all';$('task-search').value='';$('start-date').value=state.start;$('end-date').value=state.end;populateTaskOptions();syncRangeControls();render();showToast(t('resetToast'));});
$('theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('light');$('theme-toggle').setAttribute('aria-pressed',String(document.body.classList.contains('light')));});
$('motion-toggle').addEventListener('click',()=>{document.body.classList.toggle('reduce-motion');$('motion-toggle').textContent=document.body.classList.contains('reduce-motion')?t('restoreMotion'):t('reduceMotion');});
$('drawer-close').addEventListener('click',closeDrawer);$('drawer-backdrop').addEventListener('click',event=>{if(event.target===$('drawer-backdrop'))closeDrawer();});
document.querySelectorAll('[data-target]').forEach(button=>button.addEventListener('click',()=>{const target=$(button.dataset.target);if(target)target.scrollIntoView({behavior:document.body.classList.contains('reduce-motion')?'auto':'smooth',block:'start'});document.querySelectorAll('.nav-item').forEach(item=>{item.classList.toggle('active',item===button);if(item===button)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});$('breadcrumb-current').textContent=button.textContent.trim();}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('refresh-popover').hidden){$('refresh-popover').hidden=true;$('refresh-info').setAttribute('aria-expanded','false');}if(!$('drawer-backdrop').classList.contains('open'))return;if(event.key==='Escape')closeDrawer();if(event.key==='Tab'){const focusable=[...$('drawer-backdrop').querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
function exportDashboardImage(){
  const width=1600,height=1180,scale=2,canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');ctx.scale(scale,scale);
  const dark=!document.body.classList.contains('light'),palette=dark?{bg:'#0b0c0f',surface:'#15171b',raised:'#202329',text:'#f5f5f7',muted:'#a1a1a6',tertiary:'#6e6e73',line:'rgba(255,255,255,.11)',blue:'#64d2ff',blueStrong:'#2997ff',orange:'#ff9f0a',green:'#30d158'}:{bg:'#f5f5f7',surface:'#ffffff',raised:'#f0f0f3',text:'#1d1d1f',muted:'#636366',tertiary:'#8e8e93',line:'rgba(0,0,0,.1)',blue:'#0a84ff',blueStrong:'#0071e3',orange:'#d97706',green:'#248a3d'};
  const font='-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif',mono='ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace';ctx.fillStyle=palette.bg;ctx.fillRect(0,0,width,height);
  const round=(x,y,w,h,r,fill,stroke)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
  const text=(value,x,y,size,color=palette.text,weight=500,face=font)=>{ctx.font=`${weight} ${size}px ${face}`;ctx.fillStyle=color;ctx.fillText(String(value),x,y);};
  const fit=(value,maxWidth,size=14,weight=500,face=font)=>{let result=String(value);ctx.font=`${weight} ${size}px ${face}`;while(result.length>1&&ctx.measureText(result).width>maxWidth)result=`${result.slice(0,-2)}…`;return result;};
  const label=(value,x,y)=>text(value.toUpperCase(),x,y,11,palette.tertiary,700,mono);
  const card=(x,y,w,h)=>round(x,y,w,h,18,palette.surface,palette.line);
  text('Ledger',64,68,34,palette.text,700);text(state.language==='zh'?'用量分享视图':'Usage share view',66,96,15,palette.muted,500);round(338,42,194,34,17,dark?'rgba(255,159,10,.15)':'#fff1d6');text('SYNTHETIC DEMO',355,64,10,palette.orange,700,mono);text(new Date().toLocaleString(state.language==='zh'?'zh-CN':'en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),width-360,68,13,palette.muted,500,mono);text(`${rangeBounds()[0]} — ${rangeBounds()[1]}`,width-360,94,12,palette.tertiary,500,mono);ctx.fillStyle=palette.blueStrong;ctx.fillRect(64,116,1472,3);
  const quotaCards=[[state.language==='zh'?'5 小时窗口':'5-hour window',quotaSnapshot.five,'#ff9f0a'],[state.language==='zh'?'周窗口':'Weekly window',quotaSnapshot.week,palette.blueStrong]],quotaY=144,quotaW=720;
  quotaCards.forEach((item,index)=>{const x=64+index*752;card(x,quotaY,quotaW,132);label(item[0],x+24,quotaY+28);text(`${Math.round(item[1].used)}%`,x+24,quotaY+75,34,palette.text,700,mono);text(`${Math.max(0,100-Math.round(item[1].used))}% left`,x+132,quotaY+74,14,palette.muted,500);round(x+24,quotaY+94,672,10,5,palette.raised);round(x+24,quotaY+94,672*Math.max(0,Math.min(1,item[1].used/100)),10,5,item[2]);});
  const metrics=[['Total tokens',formatTokens(currentMetrics.total)],['Burn rate',currentMetrics.burnRate?t('perDay',formatTokens(currentMetrics.burnRate)):'—'],['Tokens / task',formatTokens(currentMetrics.tokensPerTask)],['Cache hit',formatPercent((currentMetrics.cacheRate||0)*100)]],kpiY=302,kpiW=356;
  metrics.forEach((item,index)=>{const x=64+index*376;card(x,kpiY,kpiW,104);label(item[0],x+20,kpiY+27);text(item[1],x+20,kpiY+72,26,palette.text,700,mono);});
  const models=currentMetrics.models||[],byVolume=[...models].sort((a,b)=>b.total-a.total).slice(0,4),byMetric=[...models].sort((a,b)=>{const av=state.leftMetric==='speed'?(a.speed||0):(a.calls?a.credits/a.calls:0),bv=state.leftMetric==='speed'?(b.speed||0):(b.calls?b.credits/b.calls:0);return bv-av;}).slice(0,4),modelY=438,panelW=720;
  const ranking=(x,title,items,metric,accent,formatValue)=>{card(x,modelY,panelW,372);label(title,x+24,modelY+30);items.forEach((item,index)=>{const rowY=modelY+72+index*72,value=metric(item),max=Math.max(...items.map(metric),1),barW=270*value/max;text(`${String(index+1).padStart(2,'0')}`,x+24,rowY+8,12,palette.tertiary,700,mono);text(fit(shortModel(item.model),155,17,650),x+64,rowY+8,17,palette.text,650);text(formatValue(value),x+510,rowY+8,16,palette.text,700,mono);round(x+64,rowY+24,600,9,4,palette.raised);round(x+64,rowY+24,Math.max(4,barW),9,4,accent);});};
  const leftMetric=state.leftMetric==='speed'?item=>item.speed||0:item=>item.calls?item.credits/item.calls:0;
  const leftFormat=value=>state.leftMetric==='speed'?`${value.toFixed(1)} t/s`:`${value.toFixed(2)} cr/turn`;
  ranking(64,state.leftMetric==='speed'?(state.language==='zh'?'生成速度':'Generation speed'):(state.language==='zh'?'额度强度':'Quota intensity'),byMetric,leftMetric,palette.orange,leftFormat);
  ranking(816,state.language==='zh'?'Token 总量排名':'Token volume',byVolume,item=>item.total,palette.blueStrong,value=>formatTokens(value));
  const tasks=[...(currentMetrics.tasks||[])].sort((a,b)=>b.total-a.total).slice(0,3),taskY=836;card(64,taskY,1472,184);label(state.language==='zh'?'高消耗任务':'Top tasks',88,taskY+30);tasks.forEach((item,index)=>{const x=88+index*480;const y=taskY+76;text(`${String(index+1).padStart(2,'0')}`,x,y,12,palette.tertiary,700,mono);text(fit(item.task,270,18,650),x+42,y,18,palette.text,650);text(`${fit(item.project,220,12,500)} · ${shortModel(item.model)}`,x+42,y+25,12,palette.muted,500);text(formatTokens(item.total),x+42,y+58,20,palette.text,700,mono);});
  round(64,1050,1472,82,16,dark?'#111827':'#1d1d1f');text('Ledger',88,1084,19,'#ffffff',700);text('Local-first Codex usage analytics',88,1107,11,'#a7b0c0',500);text('github.com/ctdaniel/codex-ledger',width-520,1096,16,'#64d2ff',700,mono);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob){reject(new Error('PNG encoding failed'));return;}const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`codex-ledger-share-${new Date().toISOString().slice(0,10)}.png`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);resolve('png');},'image/png'));
}
$('export-button').addEventListener('click',async()=>{const button=$('export-button'),label=button.querySelector('span'),original=label.textContent;button.disabled=true;label.textContent=t('exporting');try{await exportDashboardImage();showToast(t('exportToast'));}catch(error){showToast(t('exportError'));console.error('Ledger image export failed',error);}finally{button.disabled=false;label.textContent=original;}});

document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.language===state.language)return;state.language=button.dataset.language;closeDrawer();applyStaticLanguage();populateTaskOptions();$('sort-tasks').textContent=`${t('sortTokens')} ${state.descending?'↓':'↑'}`;render();}));
$('refresh-info').addEventListener('click',event=>{event.stopPropagation();const open=$('refresh-popover').hidden;$('refresh-popover').hidden=!open;$('refresh-info').setAttribute('aria-expanded',String(open));});
document.addEventListener('click',event=>{if(!event.target.closest('.refresh-cluster')){$('refresh-popover').hidden=true;$('refresh-info').setAttribute('aria-expanded','false');}});
$('refresh-button').addEventListener('click',async()=>{const button=$('refresh-button'),label=button.querySelector('span');button.classList.add('loading');button.disabled=true;label.textContent=t('refreshing');try{if(typeof window.ledgerRefreshAdapter==='function'){const result=await window.ledgerRefreshAdapter()||{};showToast(state.language==='zh'?`本地刷新完成 · ${result.records??'—'} 条记录`:`Local refresh complete · ${result.records??'—'} records`);if(result.reload!==false){window.setTimeout(()=>window.location.reload(),120);return;}}else if(IS_LIVE_REPORT){showToast(state.language==='zh'?'当前是静态快照 · 请用 --open 或 --serve 启动实时刷新':'Static snapshot · start Ledger with --open or --serve for live refresh');return;}else{showToast(state.language==='zh'?'演示模式 · 运行 python3 scripts/ledger.py --open 读取真实数据':'Demo mode · run python3 scripts/ledger.py --open for live local data');return;}}catch(error){showToast(state.language==='zh'?'刷新失败 · 已保留上次数据':'Refresh failed · kept the last data');console.error('Ledger refresh failed',error);}finally{button.classList.remove('loading');button.disabled=false;label.textContent=t('refreshData');}});

setInterval(()=>{const elapsed=Math.floor((Date.now()-quotaStarted)/1000);$('five-countdown').textContent=quotaSnapshot.five.source==='unavailable'?'—':formatCountdown(quotaSnapshot.five.seconds-elapsed);$('week-countdown').textContent=quotaSnapshot.week.source==='unavailable'?'—':formatCountdown(quotaSnapshot.week.seconds-elapsed,true);},1000);
const storedQuota=readStoredQuota();
// Prefer the quota captured with a generated Ledger report, then a newer stored/sidecar snapshot.
if(EXTERNAL_PAYLOAD?.quota)applyQuotaSnapshot({...EXTERNAL_PAYLOAD.quota,observedAt:EXTERNAL_PAYLOAD.meta?.observedAt||EXTERNAL_PAYLOAD.meta?.generatedAt||new Date().toISOString()},{persist:false,force:true});
loadQuotaScriptSync();
const sidecarQuota=window.__CODEX_QUOTA_SNAPSHOT__;
const initialQuota=snapshotTime(storedQuota)>=snapshotTime(sidecarQuota)?storedQuota:sidecarQuota;
if(initialQuota && snapshotTime(initialQuota)>=quotaObservedAt)applyQuotaSnapshot(initialQuota,{persist:false});
if(EXTERNAL_PAYLOAD?.meta?.generatedAt){const d=new Date(EXTERNAL_PAYLOAD.meta.generatedAt);if(Number.isFinite(d.getTime()))$('snapshot-time').textContent=d.toLocaleString(state.language==='zh'?'zh-CN':'en-US',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
render();
if(quotaRefreshState==='initial')window.setTimeout(async()=>{if(await loadQuotaSidecar()){renderQuota();$('snapshot-time').textContent=state.language==='zh'?'刚刚更新':'Updated just now';}},0);