// Date-only values are calendar days, never midnight instants in the user's zone.
const DAY_MS=86400000;
export function localDateString(now=new Date()){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))return null;
  return `${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function dateOrdinal(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [year,month,day]=value.split('-').map(Number);
  if(year<1||year>9999||month<1||month>12||day<1||day>31)return null;
  const utc=new Date(0);utc.setUTCHours(0,0,0,0);utc.setUTCFullYear(year,month-1,day);
  if(utc.getUTCFullYear()!==year||utc.getUTCMonth()!==month-1||utc.getUTCDate()!==day)return null;
  return Math.floor(utc.getTime()/DAY_MS);
}
export const displayDate=value=>dateOrdinal(value)===null?'':value.replaceAll('-','/');

export function warrantySummary(info={},today=localDateString()){
  const end=dateOrdinal(info?.warrantyEndDate),now=dateOrdinal(today);
  if(end===null||now===null)return {status:'unset',label:'未設定',days:null};
  const days=end-now,start=dateOrdinal(info?.warrantyStartDate);
  if(start!==null&&start>now&&start<=end)return {status:'upcoming',label:`保固尚未開始｜${displayDate(info.warrantyStartDate)} 起`,days};
  if(days<0)return {status:'expired',label:`已過期｜${displayDate(info.warrantyEndDate)} 到期`,days};
  if(days<=60)return {status:'expiring',label:`即將到期｜剩 ${days} 天`,days};
  return {status:'active',label:`保固中｜剩 ${days} 天`,days};
}

// Inclusive warranty interval: clamp start + N months to that month's last day,
// then subtract one calendar day. The UI keeps the resulting date editable.
export function warrantyEndFromMonths(start,months){
  if(dateOrdinal(start)===null||!Number.isInteger(months)||months<1||months>1200)return null;
  const [year,month,day]=start.split('-').map(Number),total=year*12+month-1+months;
  const targetYear=Math.floor(total/12),targetMonth=total%12;
  if(targetYear>9999)return null;
  const last=new Date(0);last.setUTCFullYear(targetYear,targetMonth+1,0);
  const target=new Date(0);target.setUTCFullYear(targetYear,targetMonth,Math.min(day,last.getUTCDate()));
  target.setUTCDate(target.getUTCDate()-1);
  return target.toISOString().slice(0,10);
}

// Without a completion/link field, a later service record does not implicitly
// dismiss an earlier next_service_date. Keep overdue and future dates separate.
export function maintenanceSummary(rows=[],today=localDateString()){
  const now=dateOrdinal(today),result={latestDate:null,nextDate:null,overdueDate:null};
  if(now===null||!Array.isArray(rows))return result;
  for(const row of rows){
    if(!row||row.deleted)continue;
    const performed=dateOrdinal(row.date),next=dateOrdinal(row.next_service_date);
    if(performed!==null&&performed<=now&&(!result.latestDate||row.date>result.latestDate))result.latestDate=row.date;
    if(next===null)continue;
    if(next>=now&&(!result.nextDate||row.next_service_date<result.nextDate))result.nextDate=row.next_service_date;
    if(next<now&&(!result.overdueDate||row.next_service_date>result.overdueDate))result.overdueDate=row.next_service_date;
  }
  return result;
}
