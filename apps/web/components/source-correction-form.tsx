'use client';
import {useState} from 'react';
import {usePreferences} from './preferences-provider';
export function SourceCorrectionForm({eventId}:{eventId?:string}){
 const{t}=usePreferences();const[url,setUrl]=useState('');const[note,setNote]=useState('');const[state,setState]=useState<'idle'|'pending'|'done'|'error'>('idle');
 return <form className="source-correction" onSubmit={async event=>{event.preventDefault();setState('pending');try{const response=await fetch('/api/v1/submissions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url,note,eventId})});setState(response.ok?'done':'error');}catch{setState('error');}}}>
 <label>{t('collection.sourceUrl')}<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" maxLength={1000} required /></label>
 <label>{t('collection.correction')}<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={3} required /></label>
 <button className="button-secondary" disabled={state==='pending'||state==='done'}>{t(state==='pending'?'collection.sending':state==='done'?'collection.sent':'collection.submit')}</button>
 <p aria-live="polite">{state==='done'?t('collection.receipt'):state==='error'?t('collection.submitError'):t('collection.reportNote')}</p>
 </form>;
}
