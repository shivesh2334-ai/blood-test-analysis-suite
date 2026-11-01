'use strict';
const panels = {
 'Anemia analysis': ['Hemoglobin','MCV','MCH','RDW','Reticulocytes','Ferritin','Iron','TIBC','Transferrin saturation','Vitamin B12','Folate'],
 'Renal function analysis': ['Creatinine','eGFR','Urea','BUN','Sodium','Potassium','Bicarbonate','Calcium','Phosphate','Urine ACR'],
 'Liver function analysis': ['ALT','AST','ALP','GGT','Total bilirubin','Direct bilirubin','Albumin','Total protein','INR'],
 'Thyroid function analysis': ['TSH','Free T4','Free T3','Total T4','Total T3','Anti-TPO'],
 'Lipid function analysis': ['Total cholesterol','LDL cholesterol','HDL cholesterol','Triglycerides','Non-HDL cholesterol','Lipoprotein(a)','Apolipoprotein B'],
 'Diabetes analysis': ['Fasting plasma glucose','Random plasma glucose','2-hour OGTT glucose','HbA1c','Urine ACR','Creatinine','eGFR'],
 'Vitamin D analysis': ['25-OH vitamin D','Calcium','Albumin','Phosphate','ALP','PTH','Creatinine'],
 'Vitamin B12 analysis': ['Vitamin B12','Hemoglobin','MCV','Folate','Methylmalonic acid','Homocysteine'],
 'Cancer analysis': ['Hemoglobin','WBC','Platelets','Blasts','PSA','AFP','CEA','CA-125','CA19-9','CA15-3'],
 'Rheumatoid arthritis analysis': ['Rheumatoid factor','Anti-CCP','ESR','CRP','Hemoglobin','Platelets']
};
const notes = {
 'Cancer analysis':'Tumor markers alone cannot diagnose or exclude cancer and are generally unsuitable for screening people without symptoms. Interpret with the indication, trend, examination, imaging and pathology (NCI).',
 'Rheumatoid arthritis analysis':'Persistent synovitis warrants specialist assessment. Negative RF, anti-CCP or normal inflammatory markers do not exclude rheumatoid arthritis or justify delaying referral (NICE NG100).',
 'Anemia analysis':'Record bleeding, diet, previous counts and symptoms. Laboratory comparison alone does not establish the cause of anemia.',
 'Renal function analysis':'Record baseline kidney function and timing. One eGFR result cannot establish chronic kidney disease. Urea and BUN are different tests: enter the report’s exact test and unit.',
 'Liver function analysis':'Record alcohol, medications, symptoms and prior trends. Enzyme results alone do not establish a diagnosis.',
 'Thyroid function analysis':'Use age, pregnancy and assay-specific intervals. Record thyroid medicines and biotin use.',
 'Lipid function analysis':'Reference limits are not individualized treatment targets. Record fasting status, cardiovascular history and current lipid medicines.',
 'Diabetes analysis':'Record fasting status, symptoms, pregnancy, existing diabetes and medicines. This comparison does not apply diagnostic thresholds or treatment targets.',
 'Vitamin D analysis':'Enter 25-hydroxyvitamin D with its exact unit and laboratory interval. This tool does not prescribe supplement doses.',
 'Vitamin B12 analysis':'Record neurological symptoms, diet and supplementation. Clinical findings and additional testing may be needed despite a result within the laboratory interval.'
};
const $ = id => document.getElementById(id);
Object.keys(panels).forEach(name => $('mode').add(new Option(name,name)));
const drafts = {};
let active='';
function save(){if(active)drafts[active]=[...$('fields').querySelectorAll('input')].map(x=>x.value);}
$('mode').onchange=()=>{save();active=$('mode').value;$('result').hidden=true;$('entry').hidden=!active;$('fields').replaceChildren();if(!active)return;$('guidance').textContent=notes[active];panels[active].forEach((name,i)=>{const box=document.createElement('div');box.className='card';const heading=document.createElement('h3');heading.textContent=name;box.append(heading);const grid=document.createElement('div');grid.className='grid';[['Result','number'],['Unit as reported','text'],['Lower reference limit','number'],['Upper reference limit','number']].forEach(([title,type],j)=>{const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type=type;input.id=`f${i}_${j}`;input.dataset.test=name;input.setAttribute('aria-label',`${name}: ${title}`);if(type==='number'){input.step='any';input.min='0';}input.value=drafts[active]?.[i*4+j]||'';label.append(input);grid.append(label);});box.append(grid);$('fields').append(box);});};
function classify(value,low,high){if(low===''||high==='')return 'Reference limits missing';return value<Number(low)?'Low':value>Number(high)?'High':'Within supplied interval';}
$('form').onsubmit=e=>{e.preventDefault();const rows=[];for(let i=0;i<panels[active].length;i++){const [v,u,l,h]=[0,1,2,3].map(j=>$(`f${i}_${j}`).value.trim());if(v==='')continue;if(!u){alert(`Enter the unit for ${panels[active][i]}.`);return;}if((l===''&&h!=='')||(l!==''&&h==='')||(l!==''&&Number(l)>Number(h))){alert(`Enter valid paired reference limits for ${panels[active][i]}.`);return;}rows.push({test:panels[active][i],value:Number(v),unit:u,lower:l,upper:h,status:classify(Number(v),l,h)});}if(!rows.length){alert('Enter at least one laboratory result.');return;}
 const report={analysis:active,created:new Date().toISOString(),age:$('age').value,sex:$('sex').value,pregnancy:$('pregnancy').value,context:$('context').value,results:rows,note:notes[active]};
 const out=$('result');out.replaceChildren();out.hidden=false;const title=document.createElement('h2');title.textContent=active+' — review';out.append(title);const p=document.createElement('p');p.textContent=`${rows.length} results entered. ${rows.filter(r=>['High','Low'].includes(r.status)).length} outside supplied intervals. These flags are not diagnoses or an urgency assessment. For a laboratory critical alert or severe symptoms, seek immediate clinical assessment.`;out.append(p);const wrap=document.createElement('div');wrap.className='scroll';const table=document.createElement('table');const head=table.createTHead().insertRow();['Test','Result','Supplied interval','Comparison'].forEach(x=>{const th=document.createElement('th');th.textContent=x;head.append(th);});const body=table.createTBody();rows.forEach(r=>{const tr=body.insertRow();[r.test,`${r.value} ${r.unit}`,r.lower===''?'Not provided':`${r.lower}–${r.upper} ${r.unit}`,r.status].forEach(x=>{tr.insertCell().textContent=x;});if(['High','Low'].includes(r.status))tr.className=r.status.toLowerCase();});wrap.append(table);out.append(wrap);const note=document.createElement('p');note.textContent=notes[active];out.append(note);const download=document.createElement('button');download.textContent='Download JSON report';download.onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.href=url;a.download='medlab-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};out.append(download);const print=document.createElement('button');print.className='secondary';print.textContent='Print / Save PDF';print.onclick=()=>window.print();out.append(print);out.scrollIntoView({behavior:'smooth'});
};
$('form').addEventListener('input',()=>{$('result').hidden=true;});
$('clear').onclick=()=>{for(const key of Object.keys(drafts))delete drafts[key];$('form').reset();active='';$('fields').replaceChildren();$('entry').hidden=true;$('result').hidden=true;};
if(typeof module!=='undefined')module.exports={classify,panels};
