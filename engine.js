(function(root){
'use strict';
const data=typeof module!=='undefined'?require('./data.js'):root.MedLabData;
const knowledge=typeof module!=='undefined'?require('./knowledge.js'):root.MedLabKnowledge;
const norm=s=>String(s).toLowerCase().replace(/[μµ]/g,'u').replace(/[^a-z0-9]/g,'');
const names=new Map();for(const [key,d] of Object.entries(data.references))for(const alias of d.aliases)names.set(norm(alias),key);
function canonical(name){return names.get(norm(name))||name.trim();}
function numeric(s){return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(String(s).trim())&&Number.isFinite(Number(s));}
function convert(key,value,unit){let u=norm(unit),target=norm(data.references[key]?.unit||'');if(!String(unit).trim())return null;if(u===target)return Number(value);
if(key==='Hemoglobin'&&u==='gl')return value/10;
if(['Glucose_Fasting','Glucose_Random','Glucose_OGTT'].includes(key)&&u==='mmoll')return value*18;
if(['Total_Cholesterol','LDL','HDL','Non_HDL_Cholesterol'].includes(key)&&u==='mmoll')return value*38.67;
if(key==='Triglycerides'&&u==='mmoll')return value*88.57;
if(key==='Creatinine'&&u==='umoll')return value/88.4;
if(key==='Vitamin_D'&&u==='nmoll')return value/2.5;
if(key==='Vitamin_B12'&&u==='ngl')return Number(value);
if(['Sodium','Potassium','Chloride','Bicarbonate'].includes(key)&&u==='mmoll')return Number(value);
if(key==='eGFR'&&['mlmin173m2','mlmin173m²'].includes(u))return Number(value);
if(['WBC','Platelets'].includes(key)&&['103ul','10e3ul','109l'].includes(u))return Number(value);
if(['WBC','Platelets'].includes(key)&&['cellsul','cumm','mm3','ul'].includes(u))return value/1000;
if(key==='TSH'&&['miul','uiuml','uiu/ml'].includes(u))return Number(value);
return null;}
// One result per line; unsupported lines remain visible for correction, never discarded.
function parse(text){const rows=[],unmatched=[];const aliases=[...names.keys()].sort((a,b)=>b.length-a.length);
for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;
 let matched=null,tail='';
 // Match the longest textual alias before the first result, preventing T3/FT3 and MCH/MCHC overlap.
 for(let split=1;split<line.length;split++){const prefix=line.slice(0,split).trim().replace(/[:=|,;]+$/,'').trim();const key=names.get(norm(prefix));if(!key||/[<>]/.test(prefix))continue;const rest=line.slice(split).trim().replace(/^[:=|,;]+\s*/,'');if(/^(?:[<>]=?\s*)?[-+]?\d|^(?:positive|negative|reactive|non-reactive|trace)\b/i.test(rest)){matched=key;tail=rest;}}
 if(!matched){const generic=line.match(/^([A-Za-z][A-Za-z ()_/-]*?)\s*[:=|\t]\s*(.+)$/);if(generic&&/^(?:[<>]=?\s*)?\d|^(?:positive|negative|reactive)/i.test(generic[2])){matched=canonical(generic[1]);tail=generic[2];}}
 if(!matched){unmatched.push(raw);continue;}
 const m=tail.match(/^((?:[<>]=?\s*)?[-+]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?|positive|negative|non-reactive|reactive|trace)(?:\s|[|,;]|$)(.*)$/i);
 if(!m){unmatched.push(raw);continue;}
 let result=m[1].replace(/,/g,'').replace(/\s/g,''),rest=m[2].replace(/^\s*[|,;]\s*/,'').trim();
 const ref=rest.match(/(?:ref(?:erence)?(?:\s*(?:range|interval))?\s*[:=]?\s*)?\(?([-+]?\d+(?:\.\d+)?)\s*[-–]\s*([-+]?\d+(?:\.\d+)?)\)?\s*$/i);
 let lower='',upper='';if(ref){lower=ref[1];upper=ref[2];rest=rest.slice(0,ref.index).trim();}
 const unit=rest.replace(/[|;,\s]+$/,'').trim();
 rows.push({test:matched,value:result,unit,lower,upper,source:'Parsed',raw,verified:false});
 }return {rows,unmatched};}
function compare(row){if(!numeric(row.value))return 'Qualitative / bounded result — clinical review';if(!row.unit)return 'Unit missing — not classified';if(row.lower===''&&row.upper==='')return 'Reference limits missing';if(row.lower!==''&&Number(row.value)<Number(row.lower))return 'Low';if(row.upper!==''&&Number(row.value)>Number(row.upper))return 'High';return 'Within supplied interval';}
function tokens(text){return String(text).toLowerCase().replace(/[_-]/g,' ').match(/[a-z0-9]+/g)||[];}
function retrieve(query,k=4){const docs=knowledge.map(d=>tokens(d.title+' '+d.tags+' '+d.tags+' '+d.text));const q=tokens(query);const terms=new Set(q);const scored=knowledge.map((d,i)=>{let dot=0,qlen=0,dlen=0;const all=new Set([...docs[i],...q]);for(const t of all){const idf=1+Math.log((docs.length+1)/(1+docs.filter(x=>x.includes(t)).length));const a=docs[i].filter(x=>x===t).length*idf,b=q.filter(x=>x===t).length*idf;dot+=a*b;qlen+=b*b;dlen+=a*a;}return {...d,score:dot/Math.sqrt(qlen*dlen||1)};});return scored.filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,k);}
function analyze(input,patient){const rows=input.filter(r=>String(r.value).trim()!=='').map(r=>({...r,test:canonical(r.test),category:data.references[canonical(r.test)]?.category||'Other',status:compare(r)}));
 const alerts=[],findings=[],next=[],warnings=[];const counts=new Map();rows.forEach(r=>counts.set(r.test,(counts.get(r.test)||0)+1));
 const eligible=rows.filter(r=>counts.get(r.test)===1&&numeric(r.value)&&r.verified!==false);const get=k=>{const r=eligible.find(r=>r.test===k);return r?convert(k,Number(r.value),r.unit):null;};const row=k=>eligible.find(r=>r.test===k);const stat=k=>row(k)?.status;
 for(const r of rows){if(counts.get(r.test)>1)warnings.push(`Duplicate ${r.test}: all entries are reported; reconcile duplicates before cross-test interpretation.`);if(!r.verified)warnings.push(`${r.test}: verify extraction before interpretation.`);if(!r.unit)warnings.push(`${r.test}: unit missing; no numerical interpretation.`);else if(numeric(r.value)&&data.references[r.test]&&convert(r.test,Number(r.value),r.unit)===null)warnings.push(`${r.test}: unsupported unit for pattern rules; report-interval comparison only.`);}
 const adult=Number(patient.age)>=18&&patient.pregnancy!=='Pregnant';
 const add=(title,evidence,text,source)=>findings.push({title,evidence,text,source});
 if(!adult)warnings.push('Adult diagnostic rules are suppressed for children and pregnancy. Use age/gestation-specific laboratory intervals and specialist review.');
 if(adult){for(const r of eligible){const v=convert(r.test,Number(r.value),r.unit),c=data.critical[r.test];if(v!==null&&c&&(v<c[0]||v>c[1]||(r.test==='Potassium'&&v>=6.5)))alerts.push(`${r.test} ${r.value} ${r.unit}: outside the inherited adult critical-alert threshold; verify urgently with the laboratory and treating clinician.`);}
 if(get('Blasts')>0)alerts.push('Reported circulating blasts: prompt hematology review. This does not establish leukemia.');
 const hb=get('Hemoglobin'),mcv=get('MCV');if(hb!==null&&((patient.sex==='Male'&&hb<13)||(patient.sex==='Female'&&hb<12)||stat('Hemoglobin')==='Low')){const type=mcv===null?'Anemia pattern — MCV missing':mcv<80?'Microcytic anemia pattern':mcv>100?'Macrocytic anemia pattern':'Normocytic anemia pattern';add(type,`Hemoglobin ${hb} g/dL${mcv===null?'':`, MCV ${mcv} fL`}`,'Consider iron deficiency/hemoglobin disorders if microcytic; B12/folate, liver disease and medicines if macrocytic; renal disease, inflammation, blood loss or hemolysis if normocytic. These are differential considerations.','anemia');next.push('Review CBC, smear, reticulocytes, ferritin/iron studies and bleeding history; select further tests for the clinical setting.');}
 if(stat('Ferritin')==='Low')add('Low ferritin','Below supplied interval','Supports depleted iron stores; investigate cause and clinical context.','anemia');
 if(get('Platelets')!==null&&get('Platelets')<150)add('Thrombocytopenia',`Platelets ${get('Platelets')} x10^9/L`,'Review smear, sampling artefact, trend, medicines and bleeding symptoms; MPV alone does not distinguish the cause.','anemia');
 if(get('WBC')!==null&&(get('WBC')<4||get('WBC')>11))add('Abnormal white-cell count',`WBC ${get('WBC')} x10^9/L`,'Review differential, infection/inflammation, medicines and smear. A count alone cannot diagnose infection or malignancy.','cancer');
 const eg=get('eGFR');if(eg!==null&&eg<90){const g=eg<15?'G5':eg<30?'G4':eg<45?'G3b':eg<60?'G3a':'G2';add('Reduced eGFR',`${eg} mL/min/1.73m2; GFR category ${g}`,'This is a GFR category, not a CKD diagnosis. Establish chronicity and assess urine ACR; G2 alone does not establish kidney disease.','kidney');next.push('Compare prior creatinine/eGFR, timing and urine ACR; evaluate acute illness and nephrotoxic medicines.');}
 if(get('Creatinine')>0&&get('BUN')!==null)add('BUN:creatinine ratio',`${(get('BUN')/get('Creatinine')).toFixed(1)} (both normalized to mg/dL)`,'A contextual clue only; this ratio alone cannot determine AKI cause. Urea is not substituted for BUN.','kidney');
 const alt=row('ALT'),alp=row('ALP');if(alt&&alp&&Number(alt.upper)>0&&Number(alp.upper)>0&&alt.unit===alp.unit&&(stat('ALT')==='High'||stat('ALP')==='High')){const ratio=(Number(alt.value)/Number(alt.upper))/(Number(alp.value)/Number(alp.upper));if(Number.isFinite(ratio))add('Liver injury pattern',`R ratio ${ratio.toFixed(2)}`,ratio>=5?'Hepatocellular pattern; evaluate clinical causes.':ratio<=2?'Cholestatic pattern; evaluate biliary and hepatic causes.':'Mixed pattern; evaluate medications and other hepatic causes.','liver');next.push('Review medicines/alcohol, bilirubin fractions and synthetic markers; consider serology and imaging according to presentation.');}
 for(const [key,cut,predi] of [['HbA1c',6.5,5.7],['Glucose_Fasting',126,100],['Glucose_OGTT',200,140]]){const v=get(key);if(v!==null&&v>=predi){add(v>=cut?'Diabetes-range result':'Intermediate glycemic result',`${key} ${v} ${data.references[key].unit}`,'For nonpregnant adults. A diagnostic-range result usually needs confirmation; review fasting/OGTT conditions and HbA1c limitations. Not a treatment target.','diabetes');next.push('Confirm diagnostic-range glycemia where indicated, review symptoms and individualized diabetes follow-up.');}}
 if(get('Glucose_Random')>=200)add('Raised random glucose',`${get('Glucose_Random')} mg/dL`,'Diagnostic significance depends on classic symptoms or hyperglycemic crisis; otherwise confirm using appropriate testing.','diabetes');
 const tsh=stat('TSH'),ft4=stat('Free_T4'),ft3=stat('Free_T3');if(['High','Low'].includes(tsh)){let t=tsh==='High'&&ft4==='Low'?'Pattern suggesting primary hypothyroidism':tsh==='Low'&&(ft4==='High'||ft3==='High')?'Pattern suggesting thyrotoxicosis':tsh==='High'&&ft4==='Within supplied interval'?'Possible subclinical hypothyroid pattern':tsh==='Low'&&ft4==='Within supplied interval'&&ft3==='Within supplied interval'?'Possible subclinical hyperthyroid pattern':'Incomplete or discordant thyroid pattern';add(t,'TSH and available free-hormone intervals','Review FT4/FT3, illness, biotin and thyroid treatment; repeat or refer as indicated.','thyroid');next.push('Complete free-hormone testing and review medicines/interference before treatment decisions.');}else if(ft4==='Low')add('Low FT4 with no raised TSH','Available thyroid results','Consider central thyroid disease, medicines or non-thyroidal illness; clinical review required.','thyroid');
 if(get('Triglycerides')>=500){add('Severe hypertriglyceridemia',`${get('Triglycerides')} mg/dL`,'Assess pancreatitis risk, secondary causes and need for prompt treatment.','lipids');next.push('Review fasting lipid profile, glycemia, alcohol and medication causes; individualize lipid therapy.');}
 const vd=get('Vitamin_D');if(vd!==null)add('Vitamin D status',`${vd} ng/mL normalized`,vd<12?'Increased deficiency risk by NIH/FNB thresholds.':vd<20?'Potential inadequacy by NIH/FNB thresholds.':vd>50?'Above the NIH/FNB level associated with potential adverse effects; review supplements and calcium.':'Generally adequate for most people by NIH/FNB thresholds; clinical targets vary.','vitd');
 const b12=get('Vitamin_B12');if(b12!==null){add('Total vitamin B12 interpretation',`${b12} pg/mL (= ng/L)`,b12<180?'Below NICE deficiency threshold; use locally validated limits where appropriate.':b12<=350?'Indeterminate by NICE: consider MMA if symptomatic.':'Deficiency less likely by NICE thresholds; assess symptoms and supplementation.','b12');if(b12<=350)next.push('Assess neurological symptoms and cause of low/indeterminate B12; consider MMA and clinician-directed replacement.');}
 }
 if(rows.some(r=>['RF','Anti_CCP','ESR','CRP'].includes(r.test))){add('Rheumatology review','Available antibodies and inflammatory markers','Positive results support assessment but do not diagnose RA. Persistent synovitis requires referral even with negative results.','ra');next.push('Examine for persistent synovitis and arrange rheumatology assessment when indicated.');}
 if(rows.some(r=>r.category==='Tumor Markers'||r.test==='Blasts'))add('Cancer marker interpretation','Tumor markers / hematology findings','Elevations are nonspecific; normal values do not exclude cancer. Correlate with indication, trends, imaging and pathology.','cancer');
 if(rows.some(r=>r.category==='Coagulation'))next.push('Review bleeding/thrombotic symptoms, anticoagulants and the assay-specific clinical indication.');
 for(const cat of new Set(rows.filter(r=>['High','Low'].includes(r.status)).map(r=>r.category)))next.push(`Review abnormal ${cat} results with the laboratory interval, symptoms and prior trend.`);
 const query=rows.map(r=>`${r.test} ${r.status}`).join(' ')+' '+findings.map(x=>x.title).join(' ');
 const keys=new Set(rows.map(r=>r.test)),supported=new Set(findings.map(f=>f.source));const rag=retrieve(query,knowledge.length).filter(d=>supported.has(d.id)||d.tags.split(/\s+/).some(t=>keys.has(t)));return {created:new Date().toISOString(),patient,results:rows,alerts:[...new Set(alerts)],findings,nextSteps:[...new Set(next)],warnings:[...new Set(warnings)],rag,summary:{total:rows.length,abnormal:rows.filter(r=>['High','Low'].includes(r.status)).length,unclassified:rows.filter(r=>!['High','Low','Within supplied interval'].includes(r.status)).length},ragMode:'Local TF-IDF vector retrieval with source-grounded extractive synthesis; no remote LLM'};
}
const api={data,knowledge,norm,canonical,numeric,convert,parse,compare,retrieve,analyze};if(typeof module!=='undefined')module.exports=api;else root.MedLabEngine=api;
})(globalThis);
