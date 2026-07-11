import React, { useState, useEffect } from "react";
import {
  Home, CalendarDays, Wallet, LayoutGrid, Sun, Moon,
  FileText, Plane, HeartPulse, Languages, ChevronRight, ChevronLeft,
  Clock, Settings, Coffee, Users, Inbox, Check, X, LogOut, Bell, KeyRound
} from "lucide-react";
import { hasSupabaseConfig } from "./lib/supabase";
import { signIn, signOut, getSession, getMyProfile, listRequests, createRequest, updateRequest, deleteRequest, decideRequest,
  listTeams, listEmployees, createEmployee, updateEmployee, removeFromTeam, changePassword } from "./lib/data";

/* ============================================================
   PROTOTYP — Mitarbeiter-App für Chemie-Schichtbetrieb (12h Vollkonti)
   Rotation: 1 Tag · 1 Nacht · 2 frei  ·  Schichtgruppe C
   Signature: Tag/Nacht-Farbcode + persönliches Rotations-Band
   ============================================================ */

const PATTERN = ["T", "N", "F", "F"]; // 4-Tage-Zyklus: 1 Tag · 1 Nacht · 2 frei
// rot = { offset, anchorMs }: kommt aus dem Team (teams.rotation_offset / anchor_date).

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600;700&display=swap');

.app-root *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
.app-root{
  --bg:#FFFFFF; --surface:#F4F7F9; --surface2:#EAEFF3; --line:#E2E8EC;
  --text:#181716; --muted:#5C6773; --faint:#9AA6B0;
  --tag:#C77A0A; --tag-soft:rgba(199,122,10,.12); --tag-glow:rgba(199,122,10,.16);
  --nacht:#00568A; --nacht-soft:rgba(0,86,138,.10); --nacht-glow:rgba(0,86,138,.16);
  --frei:#C4CCD3; --plus:#2E9E5B; --plus-soft:rgba(46,158,91,.12);
  --accent:#00869A; --red:#C92A2E; --red-soft:rgba(201,42,46,.10);
  font-family:'Inter',system-ui,sans-serif;
  display:flex; justify-content:center; background:#e9edf1; height:100vh; height:100dvh; overflow:hidden; padding:0;
}
.num{font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;}
.disp{font-family:'Space Grotesk',system-ui,sans-serif;}

.phone{
  width:100%; max-width:428px; background:var(--bg); color:var(--text);
  height:100%; overflow:hidden; position:relative; display:flex; flex-direction:column;
  box-shadow:0 0 40px rgba(0,0,0,.08);
}

/* header */
.hdr{padding:calc(18px + env(safe-area-inset-top)) 20px 14px; border-bottom:1px solid var(--line); flex-shrink:0;}
.hdr-top{display:flex; align-items:center; justify-content:space-between;}
.brand{font-size:11px; letter-spacing:.22em; color:var(--muted); font-weight:600; text-transform:uppercase;}
.brand-logo{height:26px; width:auto; display:block;}
.langs{display:flex; gap:4px;}
.lang-select{background:var(--surface); border:1px solid var(--line); color:var(--text);
  border-radius:8px; padding:6px 26px 6px 10px; font-size:12px; font-weight:600; cursor:pointer;
  font-family:inherit; -webkit-appearance:none; appearance:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235C6773' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat:no-repeat; background-position:right 8px center;}
.lang-select:focus{outline:none; border-color:var(--accent);}
.lang{font-size:11px; font-weight:600; color:var(--faint); background:transparent; border:1px solid var(--line);
  border-radius:999px; padding:4px 9px; cursor:pointer; letter-spacing:.04em; transition:.15s;}
.lang.on{color:#fff; background:var(--accent); border-color:var(--accent);}
.who{display:flex; align-items:center; gap:10px; margin-top:14px;}
.avatar{width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,var(--tag),var(--nacht));
  display:flex; align-items:center; justify-content:center; font-weight:700; color:#0B0E13; font-size:15px;}
.who-name{font-size:16px; font-weight:600; letter-spacing:-.01em;}
.chip{font-size:11px; font-weight:600; color:var(--muted); background:var(--surface2);
  border:1px solid var(--line); border-radius:6px; padding:2px 7px; margin-top:2px; display:inline-block;}

/* scroll body */
.body{flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding:18px 20px 24px; animation:fade .25s ease;}
@keyframes fade{from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;}}
.eyebrow{font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); font-weight:600; margin-bottom:10px;}

/* hero next-shift */
.hero{border-radius:18px; padding:20px; border:1px solid var(--line); position:relative; overflow:hidden;}
.hero.tag{background:linear-gradient(160deg,var(--tag-soft),transparent 70%); border-color:rgba(199,122,10,.32);}
.hero.nacht{background:linear-gradient(160deg,var(--nacht-soft),transparent 70%); border-color:rgba(0,86,138,.32);}
.hero-glow{position:absolute; top:-40px; right:-30px; width:150px; height:150px; border-radius:50%; filter:blur(40px);}
.hero.tag .hero-glow{background:var(--tag-glow);}
.hero.nacht .hero-glow{background:var(--nacht-glow);}
.hero-label{font-size:12px; color:var(--muted); font-weight:600; letter-spacing:.04em;}
.hero-type{display:flex; align-items:center; gap:9px; margin-top:8px;}
.hero-type .disp{font-size:23px; font-weight:700; letter-spacing:-.02em;}
.tag .accentc{color:var(--tag);} .nacht .accentc{color:var(--nacht);}
.hero-time{font-size:14px; color:var(--muted); margin-top:2px;}
.count{margin-top:16px; display:flex; align-items:baseline; gap:8px;}
.count .big{font-size:30px; font-weight:700; letter-spacing:-.01em;}
.count .lbl{font-size:12px; color:var(--muted);}

/* rotation ribbon */
.ribbon-wrap{margin-top:16px;}
.ribbon{display:flex; gap:5px;}
.seg{flex:1; height:44px; border-radius:9px; display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; position:relative; border:1px solid transparent;}
.seg.T{background:var(--tag-soft); color:var(--tag); border-color:rgba(199,122,10,.25);}
.seg.N{background:var(--nacht-soft); color:var(--nacht); border-color:rgba(0,86,138,.25);}
.seg.F{background:var(--surface); color:var(--faint); border-color:var(--line);}
.seg.today{outline:2px solid var(--text); outline-offset:1px;}
.seg .dot{position:absolute; bottom:5px; width:4px; height:4px; border-radius:50%; background:currentColor;}
.ribbon-cap{display:flex; justify-content:space-between; margin-top:9px; font-size:11px; color:var(--muted);}

/* stat cards */
.stats{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;}
.stat{background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px;}
.stat .k{font-size:11px; color:var(--muted); font-weight:600; display:flex; align-items:center; gap:6px;}
.stat .v{font-size:20px; font-weight:700; margin-top:8px; letter-spacing:-.01em;}
.v.plus{color:var(--plus);} .v.amber{color:var(--tag);}

/* generic button/row */
.ghost{width:100%; margin-top:16px; background:var(--surface); border:1px solid var(--line); color:var(--text);
  border-radius:13px; padding:14px; font-size:14px; font-weight:600; display:flex; align-items:center;
  justify-content:center; gap:9px; cursor:pointer; transition:.15s;}
.ghost:active{background:var(--surface2);}

.card{background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:16px; margin-top:14px;}
.row{display:flex; align-items:center; justify-content:space-between; padding:13px 0; border-bottom:1px solid var(--line); cursor:pointer;}
.row:last-child{border-bottom:none;}
.row-l{display:flex; align-items:center; gap:12px; font-size:14px; font-weight:500;}
.row-ic{width:34px; height:34px; border-radius:10px; background:var(--surface2); display:flex; align-items:center; justify-content:center; color:var(--muted);}
.row-r{color:var(--faint); font-size:13px; display:flex; align-items:center; gap:6px;}

/* calendar */
.cal-hd{display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;}
.cal-hd .disp{font-size:18px; font-weight:600;}
.navbtn{width:34px; height:34px; border-radius:10px; background:var(--surface); border:1px solid var(--line);
  color:var(--text); display:flex; align-items:center; justify-content:center; cursor:pointer;}
.wk{display:grid; grid-template-columns:repeat(7,1fr); gap:5px; margin-bottom:6px;}
.wk span{text-align:center; font-size:10px; color:var(--faint); font-weight:600; letter-spacing:.05em;}
.grid{display:grid; grid-template-columns:repeat(7,1fr); gap:5px;}
.cell{aspect-ratio:1; border-radius:9px; display:flex; flex-direction:column; align-items:center; justify-content:center;
  font-size:13px; font-weight:600; border:1px solid var(--line); background:var(--surface); cursor:pointer; position:relative;}
.cell.T{background:var(--tag-soft); border-color:rgba(199,122,10,.25); color:var(--tag);}
.cell.N{background:var(--nacht-soft); border-color:rgba(0,86,138,.25); color:var(--nacht);}
.cell.empty{background:transparent; border:none; cursor:default;}
.cell.today{outline:2px solid var(--text); outline-offset:1px;}
.cell.sel{outline:2px solid var(--muted); outline-offset:1px;}
.cell .tp{font-size:8px; margin-top:1px; opacity:.85;}
.cell .sun{position:absolute; top:3px; right:4px; width:5px; height:5px; border-radius:50%; background:#E5484D;}
.abs-badge{position:absolute; top:2px; right:2px; min-width:15px; height:15px; padding:0 3px; border-radius:8px;
  color:#fff; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; line-height:1;
  box-shadow:0 0 0 1.5px var(--bg);}
.legend{display:flex; gap:16px; margin-top:14px; font-size:12px; color:var(--muted);}
.legend i{display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:-1px;}

.tags{display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;}
.tg{font-size:11px; font-weight:600; padding:4px 9px; border-radius:7px;}
.tg.n{background:var(--nacht-soft); color:var(--nacht);}
.tg.s{background:var(--tag-soft); color:var(--tag);}
.tg.h{background:rgba(201,42,46,.13); color:#C92A2E;}

/* pay */
.paybig{font-size:34px; font-weight:700; letter-spacing:-.02em; margin-top:6px;}
.payrow{display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--line); font-size:14px;}
.payrow:last-child{border-bottom:none;}
.payrow .l{display:flex; align-items:center; gap:9px; color:var(--text); font-weight:500;}
.mk{width:8px; height:8px; border-radius:2px;}
.payrow .r{font-weight:600;}
.note{font-size:11px; color:var(--faint); margin-top:12px; line-height:1.5; display:flex; gap:7px;}

/* tabbar */
.tabs{flex-shrink:0; display:grid; grid-template-columns:repeat(4,1fr);
  background:var(--bg); border-top:1px solid var(--line); padding:8px 6px calc(12px + env(safe-area-inset-bottom));}
.tab{display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:none; cursor:pointer;
  color:var(--faint); font-size:10px; font-weight:600; transition:.15s;}
.tab.on{color:var(--text);}
.tab.on .tab-ic{color:var(--accent);}

.foot{text-align:center; font-size:11px; color:var(--faint); margin-top:22px; letter-spacing:.05em;}

.preview-note{background:var(--tag-soft); border:1px solid rgba(199,122,10,.25); color:var(--tag);
  border-radius:10px; padding:9px 12px; margin-bottom:14px; font-size:11.5px; font-weight:600; letter-spacing:.01em;}

.roleseg{display:flex; background:var(--surface); border:1px solid var(--line); border-radius:11px; padding:3px; margin-top:14px;}
.rolebtn{flex:1; padding:8px 2px; border:none; background:none; color:var(--muted); font-size:11px; font-weight:600; border-radius:8px; cursor:pointer; transition:.15s; letter-spacing:-.01em;}
.rolebtn.on{background:var(--surface2); color:var(--text);}
.btn-approve{flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:11px; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-weight:600; background:var(--plus-soft); color:var(--plus);}
.btn-reject{flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:11px; border-radius:10px; border:1px solid var(--line); cursor:pointer; font-size:13px; font-weight:600; background:transparent; color:#C92A2E;}
.decided{text-align:center; padding:11px; border-radius:10px; font-size:13px; font-weight:600;}
.decided.approved{background:var(--plus-soft); color:var(--plus);}
.decided.rejected{background:rgba(201,42,46,.13); color:#C92A2E;}
.decided.acked{background:var(--surface2); color:var(--muted);}
.tg.g{background:var(--plus-soft); color:var(--plus);}
.tg.mut{background:var(--surface2); color:var(--muted);}
.badge{position:absolute; top:2px; right:calc(50% - 22px); min-width:16px; height:16px; padding:0 4px; border-radius:8px; background:var(--tag); color:#0B0E13; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center;}
.tab{position:relative;}

/* antrags-formular (bottom sheet / overlay) */
.sheet{position:absolute; inset:0; background:var(--bg); z-index:20; display:flex; flex-direction:column; animation:fade .2s ease;}
.sheet-hd{padding:calc(18px + env(safe-area-inset-top)) 20px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:12px; flex-shrink:0;}
.sheet-hd .disp{font-size:18px; font-weight:600;}
.sheet-body{flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px 20px calc(20px + env(safe-area-inset-bottom));}
.field{display:grid; gap:6px; margin-bottom:16px;}
.field label{font-size:12px; color:var(--muted); font-weight:600;}
.field input, .field textarea{background:var(--surface); border:1px solid var(--line); color:var(--text);
  border-radius:10px; padding:12px; font-size:15px; font-family:inherit; width:100%;}
.field input::-webkit-calendar-picker-indicator{opacity:.55;}
.summary{background:var(--surface2); border:1px solid var(--line); border-radius:12px; padding:14px; font-size:13px; color:var(--muted); margin-bottom:16px;}
.summary b{color:var(--text); font-weight:600;}
.submit{width:100%; background:var(--plus); color:#06231a; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:700; cursor:pointer;}
.submit:disabled{opacity:.45; cursor:not-allowed;}
.mini-btn{background:var(--surface2); border:1px solid var(--line); color:var(--text); border-radius:8px;
  padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer;}
.mini-btn.danger{color:var(--red); border-color:rgba(201,42,46,.3);}
.toast{position:absolute; bottom:84px; left:20px; right:20px; background:var(--plus-soft); color:var(--plus);
  border:1px solid rgba(46,158,91,.3); border-radius:12px; padding:14px; text-align:center; font-size:14px; font-weight:600; z-index:30; animation:fade .2s ease;}

/* login + DSGVO-einwilligung */
.login{flex:1; display:flex; flex-direction:column;}
.login-top{padding:18px 20px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line);}
.login-mid{flex:1; display:flex; flex-direction:column; justify-content:center; padding:24px 22px 40px; animation:fade .3s ease;}
.login-logo{width:52px; height:52px; border-radius:15px; background:linear-gradient(135deg,var(--tag),var(--nacht));
  display:flex; align-items:center; justify-content:center; color:#0B0E13; margin-bottom:18px;}
.login-mid h1{font-size:26px; font-weight:700; letter-spacing:-.02em; margin-bottom:6px;}
.login-sub{font-size:13px; color:var(--muted); margin-bottom:24px;}
.consent{display:flex; gap:10px; align-items:flex-start; font-size:12.5px; color:var(--muted); line-height:1.5; margin:8px 0 20px; cursor:pointer;}
.consent input{width:18px; height:18px; margin-top:1px; accent-color:var(--plus); flex-shrink:0;}
.consent a{color:var(--tag); text-decoration:underline; cursor:pointer;}
.login-note{text-align:center; font-size:11px; color:var(--faint); margin-top:18px;}

/* toggle-schalter (schicht-erinnerung) */
.switch{position:relative; display:inline-block; width:42px; height:24px; flex-shrink:0; cursor:pointer;}
.switch input{opacity:0; width:0; height:0;}
.switch .track{position:absolute; inset:0; background:var(--surface2); border:1px solid var(--line); border-radius:999px; transition:.15s;}
.switch .track::after{content:""; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:var(--muted); transition:.15s;}
.switch input:checked + .track{background:var(--plus-soft); border-color:var(--plus);}
.switch input:checked + .track::after{transform:translateX(18px); background:var(--plus);}

/* rechtsseiten (impressum / datenschutz) */
.legal-sec{margin-bottom:18px;}
.legal-h{font-size:13px; font-weight:700; color:var(--text); margin-bottom:5px;}
.legal-b{font-size:13px; color:var(--muted); line-height:1.6; white-space:pre-line;}

@media (prefers-reduced-motion: reduce){ .body{animation:none;} }
`;

const I18N = {
  de: {
    hi:"Hallo", tabs:["Heute","Plan","Lohn","Mehr"],
    nextShift:"Nächste Schicht", tag:"Tagschicht", nacht:"Nachtschicht", frei:"Frei",
    cycle:"Dein Zyklus", cycleSub:"1 Tag · 1 Nacht · 2 frei",
    saldo:"Gleitzeit-Saldo", zuschlMon:"Zuschläge (Monat)", tausch:"Schicht tauschen",
    wk:["Mo","Di","Mi","Do","Fr","Sa","So"],
    months:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
    legTag:"Tag", legNacht:"Nacht", legFrei:"frei",
    detailFor:"Details", noShift:"Freier Tag – keine Schicht",
    nachtzu:"Nachtzuschlag", sonntag:"Sonntagszuschlag", feiertag:"Feiertag",
    payTitle:"Lohn-Vorschau", brutto:"Voraussichtlich brutto",
    grund:"Grundlohn", schichtzul:"Wechselschichtzulage",
    zeitkonto:"Zeitkonto", gleit:"Gleitzeit", ueber:"Überstunden (Monat)",
    lastPay:"Letzte Lohnabrechnung", openPdf:"PDF öffnen",
    payslipList:"Lohnzettel", payslipNote:"Bereitgestellt vom Lohnbüro als PDF. Reine Anzeige – keine Berechnung.", urlaubKonto:"Resturlaub",
    tarifTitle:"Tarifprofil (IG BCE)", tarifDemo:"Prototyp – Tarif eines anderen Mitarbeiters simulieren",
    entgeltgr:"Entgeltgruppe", stufe:"Stufe", weekH:"Wochenarbeitszeit", grundentgelt:"Grundentgelt (Monat)",
    tarifNote:"Beispielwerte. Grundentgelt, Stufe und Zulagen sind pro Mitarbeiter aus dem IG-BCE-Tarifwerk hinterlegt; die Zuschlagssätze gelten tariflich einheitlich.",
    krank:"Krankmeldung", urlaub:"Urlaub beantragen", docs:"Meine Dokumente",
    dFrom:"Von", dTo:"Bis", optional:"optional", send:"Antrag senden", sent:"Antrag gesendet ✓",
    myReq:"Meine Anträge", reqSummaryUrlaub:"Urlaubsantrag geht an deinen Schichtmeister zur Freigabe.",
    reqSummaryKrank:"Krankmeldung geht an deinen Schichtmeister. Die eAU kommt separat von der Krankenkasse.",
    sprache:"Sprache", settings:"Einstellungen",
    cd:(d,h,m)=> d>0 ? `in ${d} Tg ${h} Std` : `in ${h} Std ${m} Min`,
    unitStd:"Std",
    roleMA:"Mitarbeiter", roleMeister:"Schichtmeister", roleVorarbeiter:"Vorarbeiter", roleGruppenfuehrer:"Gruppenführer", crewLabel:"Schicht",
    crewScopeNote:"Prototyp – im 4-Schicht-System sieht jeder Meister nur sein eigenes Team.",
    mTabs:["Anträge","Team","Kalender","Mehr"], approvalsTitle:"Offene Anträge",
    absCalTitle:"Abwesenheits-Kalender", absentLbl:"abwesend", noneAbsent:"Niemand abwesend", warnMany:"Viele gleichzeitig abwesend – Urlaub sparsam genehmigen.", personalArea:"Persönlich", selfApproveNote:"Deinen eigenen Antrag genehmigst oder lehnst du im Tab „Anträge“ ab.",
    typeUrlaub:"Urlaub", typeKrank:"Krank", daysWord:"Tage",
    approve:"Genehmigen", reject:"Ablehnen", ack:"Zur Kenntnis",
    approved:"Genehmigt", rejected:"Abgelehnt", acked:"Bestätigt",
    eauPresent:"eAU liegt vor", eauPending:"eAU ausstehend", allClear:"Keine offenen Anträge",
    teamTitle:"Team heute", onDuty:"Heute im Dienst",
    statusDuty:"Im Dienst", statusOff:"Frei", statusSick:"Krank", statusVac:"Urlaub",
    crewPlan:"Schichtplan Team",
    selMA:"Mitarbeiter", selMeister:"Meister", selBL:"Leitung", selHR:"Personal",
    roleBL:"Betriebsleiter", roleHR:"Personalabteilung", change:"Ändern", withdraw:"Zurückziehen", save:"Speichern",
    manageEmp:"Mitarbeiter", newEmp:"Neuer Mitarbeiter", fName:"Name", roleLbl:"Rolle", createBtn:"Anlegen", empCreated:"Mitarbeiter angelegt ✓", noEmp:"Noch keine Mitarbeiter", noTeamCat:"Ohne Schicht", adminHint:"Anmeldung später mit E-Mail + Start-Passwort.",
    changePw:"Passwort ändern", newPw:"Neues Passwort", repeatPw:"Wiederholen", pwChanged:"Passwort geändert ✓", pwMismatch:"Passwörter stimmen nicht überein", pwTooShort:"Mindestens 6 Zeichen", remove:"Entfernen",
    absTitle:"Urlaubsplan & Abwesenheiten",
    stApproved:"Genehmigt", stPending:"Offen", stActive:"Aktiv",
    blTabs:["Übersicht","Abwesend","Anträge","Mehr"], blTitle:"Werk 2 · Alle Schichten",
    plantDutyLbl:"Im Dienst", plantOpenLbl:"Offene Anträge",
    hrTabs:["Lohnlauf","Zeit","Personal","Mehr"],
    payrollTitle:"Lohnlauf", payrollStatus:"In Prüfung", payrollDone:"geprüft",
    empLbl:"Mitarbeiter", timeTitle:"Zeitkorrekturen", hrEmpTitle:"Belegschaft", exportDatev:"Export an DATEV",
    tiMissOut:"Ausstempeln fehlt", tiMissIn:"Einstempeln fehlt", tiBreak:"Pause unplausibel",
    previewNote:"Phase 3 · Vorschau – im Pilotbetrieb noch nicht aktiv.",
    signin:"Anmelden", loginSub:"Melde dich mit deiner Personalnummer an.",
    loginId:"Personalnummer", email:"E-Mail", password:"Passwort",
    consentText:"Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Daten zu.",
    privacyLink:"Datenschutzerklärung", loginDemo:"Prototyp – jede Eingabe öffnet den Demo-Account.",
    logout:"Abmelden",
    reminderTitle:"Schicht-Erinnerung", reminderSub:"Push vor deiner nächsten Schicht.",
    leadEve:"Abend vorher", leadHoursOpt:"Std vorher", before:"vorher", nextReminder:"Nächste Erinnerung",
    enableNotif:"Benachrichtigungen erlauben", testReminder:"Test-Erinnerung jetzt senden",
    notifDenied:"Benachrichtigungen sind im Browser blockiert – bitte in den Browser-Einstellungen erlauben.",
    impressum:"Impressum", datenschutz:"Datenschutzerklärung",
    legalTemplateNote:"Vorlage – Firmenangaben einsetzen und vor Live-Gang anwaltlich prüfen lassen.",
  },
  tr: {
    hi:"Merhaba", tabs:["Bugün","Plan","Ücret","Diğer"],
    nextShift:"Sonraki vardiya", tag:"Gündüz vardiyası", nacht:"Gece vardiyası", frei:"Boş",
    cycle:"Vardiya döngün", cycleSub:"1 Gündüz · 1 Gece · 2 Boş",
    saldo:"Zaman bakiyesi", zuschlMon:"Ek ödemeler (ay)", tausch:"Vardiya değiştir",
    wk:["Pt","Sa","Ça","Pe","Cu","Ct","Pz"],
    months:["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
    legTag:"Gündüz", legNacht:"Gece", legFrei:"boş",
    detailFor:"Detaylar", noShift:"Boş gün – vardiya yok",
    nachtzu:"Gece zammı", sonntag:"Pazar zammı", feiertag:"Resmi tatil",
    payTitle:"Ücret önizleme", brutto:"Tahmini brüt",
    grund:"Temel ücret", schichtzul:"Vardiya primi",
    zeitkonto:"Zaman hesabı", gleit:"Esnek zaman", ueber:"Fazla mesai (ay)",
    lastPay:"Son maaş bordrosu", openPdf:"PDF aç",
    payslipList:"Maaş bordroları", payslipNote:"Bordro bürosu tarafından PDF olarak sağlanır. Yalnızca görüntüleme – hesaplama yok.", urlaubKonto:"Kalan izin",
    tarifTitle:"Tarife profili (IG BCE)", tarifDemo:"Prototip – başka bir çalışanın tarifesini simüle et",
    entgeltgr:"Ücret grubu", stufe:"Kademe", weekH:"Haftalık çalışma", grundentgelt:"Temel ücret (ay)",
    tarifNote:"Örnek değerler. Temel ücret, kademe ve primler her çalışan için IG-BCE toplu sözleşmesinden alınır; zam oranları herkes için aynıdır.",
    krank:"Hastalık bildirimi", urlaub:"İzin talep et", docs:"Belgelerim",
    dFrom:"Başlangıç", dTo:"Bitiş", optional:"opsiyonel", send:"Talep gönder", sent:"Talep gönderildi ✓",
    myReq:"Taleplerim", reqSummaryUrlaub:"İzin talebi onay için vardiya amirine gider.",
    reqSummaryKrank:"Hastalık bildirimi vardiya amirine gider. eAU ayrıca sigortadan gelir.",
    sprache:"Dil", settings:"Ayarlar",
    cd:(d,h,m)=> d>0 ? `${d} gün ${h} sa sonra` : `${h} sa ${m} dk sonra`,
    unitStd:"sa",
    roleMA:"Çalışan", roleMeister:"Vardiya amiri", roleVorarbeiter:"Kısım başı", roleGruppenfuehrer:"Grup lideri", crewLabel:"Vardiya",
    crewScopeNote:"Prototip – 4 vardiyalı sistemde her ustabaşı yalnızca kendi ekibini görür.",
    mTabs:["Talepler","Ekip","Takvim","Diğer"], approvalsTitle:"Bekleyen talepler",
    absCalTitle:"Devamsızlık takvimi", absentLbl:"yok", noneAbsent:"Kimse yok", warnMany:"Aynı anda çok kişi yok – izni dikkatli onayla.", personalArea:"Kişisel", selfApproveNote:"Kendi talebini „Talepler“ sekmesinde onaylar veya reddedersin.",
    typeUrlaub:"İzin", typeKrank:"Hastalık", daysWord:"gün",
    approve:"Onayla", reject:"Reddet", ack:"Bilgi alındı",
    approved:"Onaylandı", rejected:"Reddedildi", acked:"Onaylandı",
    eauPresent:"eAU mevcut", eauPending:"eAU bekleniyor", allClear:"Bekleyen talep yok",
    teamTitle:"Ekip bugün", onDuty:"Bugün görevde",
    statusDuty:"Görevde", statusOff:"Boş", statusSick:"Hasta", statusVac:"İzinde",
    crewPlan:"Ekip vardiya planı",
    selMA:"Çalışan", selMeister:"Ustabaşı", selBL:"Yönetim", selHR:"Personel",
    roleBL:"İşletme müdürü", roleHR:"Personel dairesi", change:"Değiştir", withdraw:"Geri çek", save:"Kaydet",
    manageEmp:"Çalışanlar", newEmp:"Yeni çalışan", fName:"Ad", roleLbl:"Rol", createBtn:"Oluştur", empCreated:"Çalışan oluşturuldu ✓", noEmp:"Henüz çalışan yok", noTeamCat:"Vardiyasız", adminHint:"Giriş: e-posta + başlangıç şifresi.",
    changePw:"Şifre değiştir", newPw:"Yeni şifre", repeatPw:"Tekrar", pwChanged:"Şifre değiştirildi ✓", pwMismatch:"Şifreler eşleşmiyor", pwTooShort:"En az 6 karakter", remove:"Çıkar",
    absTitle:"İzin planı & devamsızlıklar",
    stApproved:"Onaylı", stPending:"Bekliyor", stActive:"Aktif",
    blTabs:["Genel","Devamsız","Talepler","Diğer"], blTitle:"Tesis 2 · Tüm vardiyalar",
    plantDutyLbl:"Görevde", plantOpenLbl:"Bekleyen talep",
    hrTabs:["Bordro","Zaman","Personel","Diğer"],
    payrollTitle:"Bordro dönemi", payrollStatus:"İncelemede", payrollDone:"incelendi",
    empLbl:"çalışan", timeTitle:"Zaman düzeltmeleri", hrEmpTitle:"Kadro", exportDatev:"DATEV'e aktar",
    tiMissOut:"Çıkış eksik", tiMissIn:"Giriş eksik", tiBreak:"Mola tutarsız",
    previewNote:"3. Faz · Önizleme – pilot işletmede henüz aktif değil.",
    signin:"Giriş", loginSub:"Personel numaranla giriş yap.",
    loginId:"Personel numarası", email:"E-posta", password:"Şifre",
    consentText:"Gizlilik politikasını okudum ve verilerimin işlenmesini kabul ediyorum.",
    privacyLink:"Gizlilik politikası", loginDemo:"Prototip – her giriş demo hesabını açar.",
    logout:"Çıkış",
    reminderTitle:"Vardiya hatırlatması", reminderSub:"Sonraki vardiyandan önce bildirim.",
    leadEve:"Bir akşam önce", leadHoursOpt:"saat önce", before:"önce", nextReminder:"Sonraki hatırlatma",
    enableNotif:"Bildirimlere izin ver", testReminder:"Test hatırlatması gönder",
    notifDenied:"Bildirimler tarayıcıda engellenmiş – lütfen tarayıcı ayarlarından izin ver.",
    impressum:"Künye", datenschutz:"Gizlilik politikası",
    legalTemplateNote:"Şablon – şirket bilgilerini girin ve yayına almadan önce hukukçuya kontrol ettirin.",
  },
  en: {
    hi:"Hi", tabs:["Today","Plan","Pay","More"],
    nextShift:"Next shift", tag:"Day shift", nacht:"Night shift", frei:"Off",
    cycle:"Your rotation", cycleSub:"1 day · 1 night · 2 off",
    saldo:"Flextime balance", zuschlMon:"Premiums (month)", tausch:"Swap a shift",
    wk:["Mo","Tu","We","Th","Fr","Sa","Su"],
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
    legTag:"Day", legNacht:"Night", legFrei:"off",
    detailFor:"Details", noShift:"Day off – no shift",
    nachtzu:"Night premium", sonntag:"Sunday premium", feiertag:"Holiday",
    payTitle:"Pay preview", brutto:"Estimated gross",
    grund:"Base pay", schichtzul:"Rotating-shift allowance",
    zeitkonto:"Time account", gleit:"Flextime", ueber:"Overtime (month)",
    lastPay:"Last payslip", openPdf:"Open PDF",
    payslipList:"Payslips", payslipNote:"Provided by payroll as PDF. View only – no calculation.", urlaubKonto:"Leave left",
    tarifTitle:"Pay-grade profile (IG BCE)", tarifDemo:"Prototype – simulate another employee's tariff",
    entgeltgr:"Pay grade", stufe:"Step", weekH:"Weekly hours", grundentgelt:"Base pay (month)",
    tarifNote:"Sample figures. Base pay, step and allowances are stored per employee from the IG BCE agreement; premium rates are uniform for everyone.",
    krank:"Report sick", urlaub:"Request leave", docs:"My documents",
    dFrom:"From", dTo:"To", optional:"optional", send:"Send request", sent:"Request sent ✓",
    myReq:"My requests", reqSummaryUrlaub:"Your leave request goes to your shift supervisor for approval.",
    reqSummaryKrank:"Your sick note goes to your shift supervisor. The eAU arrives separately from your health insurer.",
    sprache:"Language", settings:"Settings",
    cd:(d,h,m)=> d>0 ? `in ${d}d ${h}h` : `in ${h}h ${m}min`,
    unitStd:"h",
    roleMA:"Employee", roleMeister:"Shift supervisor", roleVorarbeiter:"Foreman", roleGruppenfuehrer:"Group leader", crewLabel:"Crew",
    crewScopeNote:"Prototype – in a 4-crew system each supervisor sees only their own team.",
    mTabs:["Requests","Team","Calendar","More"], approvalsTitle:"Open requests",
    absCalTitle:"Absence calendar", absentLbl:"away", noneAbsent:"Nobody away", warnMany:"Many away at once – approve leave sparingly.", personalArea:"Personal", selfApproveNote:"You approve or reject your own request in the “Requests” tab.",
    typeUrlaub:"Leave", typeKrank:"Sick", daysWord:"days",
    approve:"Approve", reject:"Decline", ack:"Acknowledge",
    approved:"Approved", rejected:"Declined", acked:"Acknowledged",
    eauPresent:"eAU on file", eauPending:"eAU pending", allClear:"No open requests",
    teamTitle:"Team today", onDuty:"On duty today",
    statusDuty:"On duty", statusOff:"Off", statusSick:"Sick", statusVac:"On leave",
    crewPlan:"Team shift plan",
    selMA:"Employee", selMeister:"Supervisor", selBL:"Management", selHR:"HR",
    roleBL:"Plant manager", roleHR:"HR department", change:"Change", withdraw:"Withdraw", save:"Save",
    manageEmp:"Employees", newEmp:"New employee", fName:"Name", roleLbl:"Role", createBtn:"Create", empCreated:"Employee created ✓", noEmp:"No employees yet", noTeamCat:"No shift", adminHint:"Login later with email + starting password.",
    changePw:"Change password", newPw:"New password", repeatPw:"Repeat", pwChanged:"Password changed ✓", pwMismatch:"Passwords do not match", pwTooShort:"At least 6 characters", remove:"Remove",
    absTitle:"Leave plan & absences",
    stApproved:"Approved", stPending:"Pending", stActive:"Active",
    blTabs:["Overview","Absences","Requests","More"], blTitle:"Plant 2 · All crews",
    plantDutyLbl:"On duty", plantOpenLbl:"Open requests",
    hrTabs:["Payroll","Time","People","More"],
    payrollTitle:"Payroll run", payrollStatus:"In review", payrollDone:"reviewed",
    empLbl:"employees", timeTitle:"Time corrections", hrEmpTitle:"Workforce", exportDatev:"Export to DATEV",
    tiMissOut:"Missing clock-out", tiMissIn:"Missing clock-in", tiBreak:"Break implausible",
    previewNote:"Phase 3 · Preview – not active in the pilot.",
    signin:"Sign in", loginSub:"Sign in with your personnel number.",
    loginId:"Personnel number", email:"Email", password:"Password",
    consentText:"I have read the privacy policy and consent to the processing of my data.",
    privacyLink:"Privacy policy", loginDemo:"Prototype – any input opens the demo account.",
    logout:"Sign out",
    reminderTitle:"Shift reminder", reminderSub:"Push before your next shift.",
    leadEve:"Evening before", leadHoursOpt:"hrs before", before:"before", nextReminder:"Next reminder",
    enableNotif:"Enable notifications", testReminder:"Send test reminder now",
    notifDenied:"Notifications are blocked in the browser – please allow them in your browser settings.",
    impressum:"Legal notice", datenschutz:"Privacy policy",
    legalTemplateNote:"Template – insert company details and have it reviewed by a lawyer before going live.",
  },
  ru: {
    hi:"Привет", tabs:["Сегодня","План","Зарплата","Ещё"],
    nextShift:"Следующая смена", tag:"Дневная смена", nacht:"Ночная смена", frei:"Выходной",
    cycle:"Твой цикл", cycleSub:"1 день · 1 ночь · 2 выходных",
    saldo:"Баланс гибкого времени", zuschlMon:"Надбавки (месяц)", tausch:"Обмен смены",
    wk:["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],
    months:["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
    legTag:"День", legNacht:"Ночь", legFrei:"вых.",
    detailFor:"Подробности", noShift:"Выходной – смены нет",
    nachtzu:"Ночная надбавка", sonntag:"Воскресная надбавка", feiertag:"Праздник",
    payTitle:"Предпросмотр зарплаты", brutto:"Ориентировочно брутто",
    grund:"Базовая оплата", schichtzul:"Надбавка за сменность",
    zeitkonto:"Счёт времени", gleit:"Гибкое время", ueber:"Сверхурочные (месяц)",
    lastPay:"Последний расчётный лист", openPdf:"Открыть PDF",
    payslipList:"Расчётные листы", payslipNote:"Предоставлено расчётным отделом в PDF. Только просмотр – без расчёта.", urlaubKonto:"Остаток отпуска",
    tarifTitle:"Тарифный профиль (IG BCE)", tarifDemo:"Прототип – смоделировать тариф другого сотрудника",
    entgeltgr:"Тарифная группа", stufe:"Ступень", weekH:"Часы в неделю", grundentgelt:"Базовая оплата (месяц)",
    tarifNote:"Примерные значения. Базовая оплата, ступень и надбавки хранятся для каждого сотрудника по тарифу IG BCE; ставки надбавок единые для всех.",
    krank:"Больничный", urlaub:"Запросить отпуск", docs:"Мои документы",
    dFrom:"С", dTo:"По", optional:"необязательно", send:"Отправить заявку", sent:"Заявка отправлена ✓",
    myReq:"Мои заявки", reqSummaryUrlaub:"Заявка на отпуск отправляется бригадиру на согласование.",
    reqSummaryKrank:"Больничный отправляется бригадиру. eAU приходит отдельно из больничной кассы.",
    sprache:"Язык", settings:"Настройки",
    cd:(d,h,m)=> d>0 ? `через ${d} дн ${h} ч` : `через ${h} ч ${m} мин`,
    unitStd:"ч",
    roleMA:"Сотрудник", roleMeister:"Сменный мастер", roleVorarbeiter:"Старший рабочий", roleGruppenfuehrer:"Руководитель группы", crewLabel:"Смена",
    crewScopeNote:"Прототип – в системе из 4 смен каждый бригадир видит только свою бригаду.",
    mTabs:["Заявки","Бригада","Календарь","Ещё"], approvalsTitle:"Открытые заявки",
    absCalTitle:"Календарь отсутствий", absentLbl:"нет", noneAbsent:"Никто не отсутствует", warnMany:"Много отсутствующих одновременно – одобряйте отпуск осторожно.", personalArea:"Личное", selfApproveNote:"Свою заявку ты одобряешь или отклоняешь во вкладке «Заявки».",
    typeUrlaub:"Отпуск", typeKrank:"Больничный", daysWord:"дн.",
    approve:"Одобрить", reject:"Отклонить", ack:"Принять к сведению",
    approved:"Одобрено", rejected:"Отклонено", acked:"Подтверждено",
    eauPresent:"eAU есть", eauPending:"eAU ожидается", allClear:"Нет открытых заявок",
    teamTitle:"Бригада сегодня", onDuty:"Сегодня на смене",
    statusDuty:"На смене", statusOff:"Выходной", statusSick:"Болеет", statusVac:"В отпуске",
    crewPlan:"План смены бригады",
    selMA:"Сотрудник", selMeister:"Бригадир", selBL:"Руководство", selHR:"Кадры",
    roleBL:"Начальник завода", roleHR:"Отдел кадров", change:"Изменить", withdraw:"Отозвать", save:"Сохранить",
    manageEmp:"Сотрудники", newEmp:"Новый сотрудник", fName:"Имя", roleLbl:"Роль", createBtn:"Создать", empCreated:"Сотрудник создан ✓", noEmp:"Пока нет сотрудников", noTeamCat:"Без смены", adminHint:"Вход: эл. почта + стартовый пароль.",
    changePw:"Сменить пароль", newPw:"Новый пароль", repeatPw:"Повторите", pwChanged:"Пароль изменён ✓", pwMismatch:"Пароли не совпадают", pwTooShort:"Минимум 6 символов", remove:"Убрать",
    absTitle:"План отпусков и отсутствия",
    stApproved:"Одобрено", stPending:"Ожидает", stActive:"Активно",
    blTabs:["Обзор","Отсутствия","Заявки","Ещё"], blTitle:"Завод 2 · Все смены",
    plantDutyLbl:"На смене", plantOpenLbl:"Открытые заявки",
    hrTabs:["Зарплата","Время","Персонал","Ещё"],
    payrollTitle:"Расчёт зарплаты", payrollStatus:"На проверке", payrollDone:"проверено",
    empLbl:"сотрудников", timeTitle:"Корректировки времени", hrEmpTitle:"Персонал", exportDatev:"Экспорт в DATEV",
    tiMissOut:"Нет отметки об уходе", tiMissIn:"Нет отметки о приходе", tiBreak:"Перерыв неправдоподобен",
    previewNote:"Фаза 3 · Предпросмотр – в пилоте пока не активно.",
    signin:"Войти", loginSub:"Войди по своему табельному номеру.",
    loginId:"Табельный номер", email:"Эл. почта", password:"Пароль",
    consentText:"Я прочитал(а) политику конфиденциальности и согласен(на) на обработку моих данных.",
    privacyLink:"Политика конфиденциальности", loginDemo:"Прототип – любой ввод открывает демо-аккаунт.",
    logout:"Выйти",
    reminderTitle:"Напоминание о смене", reminderSub:"Уведомление перед следующей сменой.",
    leadEve:"Вечером накануне", leadHoursOpt:"ч до", before:"до", nextReminder:"Следующее напоминание",
    enableNotif:"Разрешить уведомления", testReminder:"Отправить тестовое напоминание",
    notifDenied:"Уведомления заблокированы в браузере – разреши их в настройках браузера.",
    impressum:"Выходные данные", datenschutz:"Политика конфиденциальности",
    legalTemplateNote:"Шаблон – вставьте данные компании и проверьте у юриста перед запуском.",
  },
  pl: {
    hi:"Cześć", tabs:["Dziś","Plan","Wypłata","Więcej"],
    nextShift:"Następna zmiana", tag:"Zmiana dzienna", nacht:"Zmiana nocna", frei:"Wolne",
    cycle:"Twój cykl", cycleSub:"1 dzień · 1 noc · 2 wolne",
    saldo:"Saldo czasu", zuschlMon:"Dodatki (miesiąc)", tausch:"Zamiana zmiany",
    wk:["Pn","Wt","Śr","Cz","Pt","So","Nd"],
    months:["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"],
    legTag:"Dzień", legNacht:"Noc", legFrei:"wolne",
    detailFor:"Szczegóły", noShift:"Dzień wolny – brak zmiany",
    nachtzu:"Dodatek nocny", sonntag:"Dodatek niedzielny", feiertag:"Święto",
    payTitle:"Podgląd wypłaty", brutto:"Szacunkowo brutto",
    grund:"Wynagrodzenie podstawowe", schichtzul:"Dodatek zmianowy",
    zeitkonto:"Konto czasu", gleit:"Czas elastyczny", ueber:"Nadgodziny (miesiąc)",
    lastPay:"Ostatni pasek wypłaty", openPdf:"Otwórz PDF",
    payslipList:"Paski wypłat", payslipNote:"Udostępnione przez dział płac w PDF. Tylko podgląd – bez obliczeń.", urlaubKonto:"Pozostały urlop",
    tarifTitle:"Profil taryfowy (IG BCE)", tarifDemo:"Prototyp – symuluj taryfę innego pracownika",
    entgeltgr:"Grupa taryfowa", stufe:"Stopień", weekH:"Godziny tygodniowo", grundentgelt:"Wynagrodzenie podstawowe (miesiąc)",
    tarifNote:"Wartości przykładowe. Wynagrodzenie podstawowe, stopień i dodatki są zapisane dla każdego pracownika wg układu IG BCE; stawki dodatków są jednolite dla wszystkich.",
    krank:"Zgłoś chorobę", urlaub:"Wniosek o urlop", docs:"Moje dokumenty",
    dFrom:"Od", dTo:"Do", optional:"opcjonalnie", send:"Wyślij wniosek", sent:"Wniosek wysłany ✓",
    myReq:"Moje wnioski", reqSummaryUrlaub:"Wniosek o urlop trafia do mistrza zmiany do zatwierdzenia.",
    reqSummaryKrank:"Zgłoszenie choroby trafia do mistrza zmiany. eAU przychodzi osobno z kasy chorych.",
    sprache:"Język", settings:"Ustawienia",
    cd:(d,h,m)=> d>0 ? `za ${d} dni ${h} godz` : `za ${h} godz ${m} min`,
    unitStd:"godz",
    roleMA:"Pracownik", roleMeister:"Mistrz zmiany", roleVorarbeiter:"Brygadzista", roleGruppenfuehrer:"Lider grupy", crewLabel:"Zmiana",
    crewScopeNote:"Prototyp – w systemie 4 zmian każdy mistrz widzi tylko swój zespół.",
    mTabs:["Wnioski","Zespół","Kalendarz","Więcej"], approvalsTitle:"Otwarte wnioski",
    absCalTitle:"Kalendarz nieobecności", absentLbl:"poza", noneAbsent:"Nikt nieobecny", warnMany:"Wielu naraz nieobecnych – zatwierdzaj urlop ostrożnie.", personalArea:"Osobiste", selfApproveNote:"Własny wniosek zatwierdzasz lub odrzucasz w zakładce „Wnioski“.",
    typeUrlaub:"Urlop", typeKrank:"Choroba", daysWord:"dni",
    approve:"Zatwierdź", reject:"Odrzuć", ack:"Do wiadomości",
    approved:"Zatwierdzono", rejected:"Odrzucono", acked:"Potwierdzono",
    eauPresent:"eAU dostępne", eauPending:"eAU oczekuje", allClear:"Brak otwartych wniosków",
    teamTitle:"Zespół dziś", onDuty:"Dziś na służbie",
    statusDuty:"Na służbie", statusOff:"Wolne", statusSick:"Chory", statusVac:"Na urlopie",
    crewPlan:"Plan zmian zespołu",
    selMA:"Pracownik", selMeister:"Mistrz", selBL:"Kierownictwo", selHR:"Kadry",
    roleBL:"Kierownik zakładu", roleHR:"Dział kadr", change:"Zmień", withdraw:"Wycofaj", save:"Zapisz",
    manageEmp:"Pracownicy", newEmp:"Nowy pracownik", fName:"Imię i nazwisko", roleLbl:"Rola", createBtn:"Utwórz", empCreated:"Pracownik utworzony ✓", noEmp:"Brak pracowników", noTeamCat:"Bez zmiany", adminHint:"Logowanie: e-mail + hasło startowe.",
    changePw:"Zmień hasło", newPw:"Nowe hasło", repeatPw:"Powtórz", pwChanged:"Hasło zmienione ✓", pwMismatch:"Hasła nie są zgodne", pwTooShort:"Minimum 6 znaków", remove:"Usuń",
    absTitle:"Plan urlopów i nieobecności",
    stApproved:"Zatwierdzono", stPending:"Oczekuje", stActive:"Aktywne",
    blTabs:["Przegląd","Nieobecni","Wnioski","Więcej"], blTitle:"Zakład 2 · Wszystkie zmiany",
    plantDutyLbl:"Na służbie", plantOpenLbl:"Otwarte wnioski",
    hrTabs:["Płace","Czas","Kadry","Więcej"],
    payrollTitle:"Naliczanie płac", payrollStatus:"W weryfikacji", payrollDone:"zweryfikowano",
    empLbl:"pracowników", timeTitle:"Korekty czasu", hrEmpTitle:"Załoga", exportDatev:"Eksport do DATEV",
    tiMissOut:"Brak wylogowania", tiMissIn:"Brak zalogowania", tiBreak:"Przerwa niewiarygodna",
    previewNote:"Faza 3 · Podgląd – nieaktywne w pilotażu.",
    signin:"Zaloguj się", loginSub:"Zaloguj się swoim numerem personalnym.",
    loginId:"Numer personalny", email:"E-mail", password:"Hasło",
    consentText:"Przeczytałem(am) politykę prywatności i zgadzam się na przetwarzanie moich danych.",
    privacyLink:"Polityka prywatności", loginDemo:"Prototyp – każde dane otwierają konto demo.",
    logout:"Wyloguj",
    reminderTitle:"Przypomnienie o zmianie", reminderSub:"Powiadomienie przed następną zmianą.",
    leadEve:"Wieczorem dzień wcześniej", leadHoursOpt:"godz wcześniej", before:"wcześniej", nextReminder:"Następne przypomnienie",
    enableNotif:"Włącz powiadomienia", testReminder:"Wyślij testowe przypomnienie",
    notifDenied:"Powiadomienia są zablokowane w przeglądarce – zezwól na nie w ustawieniach przeglądarki.",
    impressum:"Nota prawna", datenschutz:"Polityka prywatności",
    legalTemplateNote:"Szablon – wstaw dane firmy i sprawdź u prawnika przed uruchomieniem.",
  },
};

const DAY_MS = 86400000;
const eur = (n) => n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €";

// shift type for a given Date, continuous across months
// Schichtart (T/N/F) aus dem Rotationsmuster + Team-Rotation.
// rot.anchorMs = UTC-Mitternacht des Ankertags, rot.offset = Team-Versatz (0–3).
function shiftType(date, rot){
  const anchorMs = rot?.anchorMs ?? 0;
  const offset = rot?.offset ?? 0;
  const dayMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((dayMs - anchorMs)/DAY_MS);
  const idx = (((days + offset) % PATTERN.length) + PATTERN.length) % PATTERN.length;
  return PATTERN[idx];
}
function isSun(date){ return date.getDay() === 0; }

// find next working shift start from now
function nextShift(now, rot){
  for(let i=0;i<9;i++){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i);
    const t = shiftType(d, rot);
    if(t==="F") continue;
    const start = new Date(d); start.setHours(t==="T"?5:17, 25, 0, 0);
    if(start.getTime() > now.getTime()) return {type:t, start};
  }
  return {type:"T", start:new Date(now.getTime()+DAY_MS)};
}


// Offene Anträge je Schichtgruppe (Meister sieht nur sein Team)
const REQUESTS = {
  A: [
    {id:"a1", name:"Lukas Bauer", type:"urlaub", from:"22.04.", to:"26.04.", days:5},
    {id:"a2", name:"Petra Wolf", type:"krank", from:"heute", to:"—", eau:true},
  ],
  B: [
    {id:"b1", name:"Thomas Klein", type:"urlaub", from:"05.05.", to:"16.05.", days:10},
  ],
  C: [
    {id:"c1", name:"Daniel Schäfer", type:"urlaub", from:"14.04.", to:"18.04.", days:5},
    {id:"c2", name:"Markus Weber", type:"krank", from:"heute", to:"—", eau:true},
    {id:"c3", name:"Sarah Hoffmann", type:"urlaub", from:"02.05.", to:"09.05.", days:6},
  ],
  D: [
    {id:"d1", name:"Jan Wagner", type:"krank", from:"gestern", to:"—", eau:false},
    {id:"d2", name:"Anna Keller", type:"urlaub", from:"28.04.", to:"30.04.", days:3},
  ],
};

// Team je Schichtgruppe · st: duty | off | sick | vac
const TEAM = {
  A: [{name:"Lukas Bauer",st:"vac"},{name:"Petra Wolf",st:"sick"},{name:"Nina Braun",st:"duty"},{name:"Andreas Ott",st:"duty"},{name:"Peter Lang",st:"off"},{name:"Martin Richter",st:"duty"}],
  B: [{name:"Thomas Klein",st:"vac"},{name:"Sabine Vogt",st:"duty"},{name:"Ben Krüger",st:"duty"},{name:"Kevin Roth",st:"off"},{name:"Doris Pohl",st:"duty"}],
  C: [{name:"Daniel Schäfer",st:"duty"},{name:"Markus Weber",st:"sick"},{name:"Sarah Hoffmann",st:"vac"},{name:"Paul Neumann",st:"duty"},{name:"Andreas Kaiser",st:"duty"},{name:"Jonas Schmidt",st:"off"},{name:"Lena Fischer",st:"duty"},{name:"Michael Ostermann",st:"duty"}],
  D: [{name:"Jan Wagner",st:"sick"},{name:"Anna Keller",st:"vac"},{name:"Robert Vogel",st:"duty"},{name:"Christina Conrad",st:"duty"},{name:"Tim Berger",st:"off"}],
};

const initials = (n)=> n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// Urlaubsplan / Abwesenheiten je Schichtgruppe (genehmigt, offen, aktiv-krank)
const ABSENCES = {
  A:[{name:"Lukas Bauer",type:"urlaub",from:"20.07.",to:"24.07.",status:"pending"},{name:"Petra Wolf",type:"krank",from:"09.07.",to:"—",status:"active"}],
  B:[{name:"Thomas Klein",type:"urlaub",from:"14.07.",to:"25.07.",status:"pending"},{name:"Kevin Roth",type:"urlaub",from:"21.07.",to:"24.07.",status:"approved"}],
  C:[
    {name:"Sarah Hoffmann",type:"urlaub",from:"14.07.",to:"18.07.",status:"approved"},
    {name:"Paul Neumann",type:"urlaub",from:"16.07.",to:"22.07.",status:"approved"},
    {name:"Markus Weber",type:"krank",from:"09.07.",to:"—",status:"active"},
    {name:"Andreas Kaiser",type:"urlaub",from:"17.07.",to:"19.07.",status:"pending"},
    {name:"Jonas Schmidt",type:"urlaub",from:"21.07.",to:"25.07.",status:"pending"},
    {name:"Lena Fischer",type:"urlaub",from:"28.07.",to:"01.08.",status:"approved"},
  ],
  D:[{name:"Anna Keller",type:"urlaub",from:"28.07.",to:"30.07.",status:"pending"},{name:"Jan Wagner",type:"krank",from:"06.07.",to:"—",status:"active"}],
};
const TIME_ISSUES = [
  {name:"Daniel Schäfer",date:"07.04.",key:"tiMissOut"},
  {name:"Jonas Schmidt",date:"05.04.",key:"tiBreak"},
  {name:"Anna Keller",date:"03.04.",key:"tiMissIn"},
];

// "14.07." -> {d,mo}; "—"/leer -> null
function parseDM(s){
  if(!s) return null;
  const m = s.match(/(\d{1,2})\.(\d{1,2})\./);
  return m ? { d:+m[1], mo:+m[2] } : null;
}
// Deckt eine Abwesenheit den Tag ab? Jahr fix 2026; offenes Ende (Krank) = ab Start 60 Tage laufend.
function absCoversDay(a, date){
  const f = parseDM(a.from); if(!f) return false;
  const from = Date.UTC(2026, f.mo-1, f.d);
  const tRaw = parseDM(a.to);
  const to = tRaw ? Date.UTC(2026, tRaw.mo-1, tRaw.d) : from + 60*86400000;
  const cell = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return cell >= from && cell <= to;
}

// Rechts-Vorlagen (verbindlich auf Deutsch; Firmendaten einsetzen, anwaltlich prüfen lassen)
const IMPRESSUM = [
  { h:"Angaben gemäß § 5 DDG", b:"SE Tylose GmbH & Co. KG\nIndustriepark Kalle-Albert\nKasteler Straße 45\n65203 Wiesbaden\nDeutschland" },
  { h:"Kontakt", b:"Telefon: +49 611 962-04\nTelefax: +49 611 962-9267\nE-Mail: info@setylose.com" },
  { h:"Vertreten durch", b:"Persönlich haftende Gesellschafterin:\nSE Tylose Verwaltungs GmbH, Kasteler Straße 45, 65203 Wiesbaden\nGeschäftsführer: Hiroshi Jomori" },
  { h:"Registereintrag", b:"SE Tylose GmbH & Co. KG: Amtsgericht Wiesbaden, HRA 7921\nSE Tylose Verwaltungs GmbH: Amtsgericht Wiesbaden, HRB 21112" },
  { h:"Umsatzsteuer-ID", b:"USt-IdNr. gemäß § 27a UStG:\nDE813776802" },
  { h:"Verantwortlich i.S.d. § 18 Abs. 2 MStV", b:"[Name und Anschrift der verantwortlichen Person – noch zu benennen]" },
];
const DATENSCHUTZ = [
  { h:"1. Verantwortlicher", b:"Verantwortlich für die Datenverarbeitung in dieser App ist die SE Tylose GmbH & Co. KG, Kasteler Straße 45, 65203 Wiesbaden, E-Mail: info@setylose.com." },
  { h:"2. Welche Daten wir verarbeiten", b:"Stammdaten (Name, Personalnummer, Schichtgruppe, Entgeltgruppe), Schicht- und Zeiterfassungsdaten, Abwesenheitsanträge (Urlaub, Krankmeldung) sowie vom Lohnbüro bereitgestellte Lohnzettel." },
  { h:"3. Zweck und Rechtsgrundlage", b:"Die Verarbeitung erfolgt zur Durchführung des Beschäftigungsverhältnisses (Art. 6 Abs. 1 lit. b, Art. 88 DSGVO i.V.m. § 26 BDSG). Gesundheitsdaten (Krankmeldungen) werden auf Grundlage von Art. 9 Abs. 2 lit. b DSGVO verarbeitet." },
  { h:"4. Empfänger", b:"Zugriff haben ausschließlich berechtigte Personen im Rahmen ihrer Rolle (Schichtmeister, Betriebsleitung, Personalabteilung). Das Hosting erfolgt bei [Auftragsverarbeiter] in einem Rechenzentrum in der EU; ein Auftragsverarbeitungsvertrag (Art. 28 DSGVO) liegt vor." },
  { h:"5. Speicherdauer", b:"Daten werden gelöscht, sobald sie für die genannten Zwecke nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungsfristen entgegenstehen." },
  { h:"6. Deine Rechte", b:"Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde." },
  { h:"7. Kontakt Datenschutz", b:"SE Tylose GmbH & Co. KG, Kasteler Straße 45, 65203 Wiesbaden\nDatenschutzbeauftragte/r: [noch zu benennen]\nE-Mail: info@setylose.com" },
];

export default function App(){
  const [lang,setLang] = useState("de");
  const [tab,setTab] = useState(0);
  const [now,setNow] = useState(new Date());
  const [monthOff,setMonthOff] = useState(0);
  const [role,setRole] = useState("ma");   // ma | meister
  const [crew,setCrew] = useState("C");     // A | B | C | D
  const [decisions,setDecisions] = useState({});
  const [sel,setSel] = useState(null);
  const [submitted,setSubmitted] = useState([]);  // vom Mitarbeiter gestellte Anträge
  const [form,setForm] = useState(null);           // null | "urlaub" | "krank"
  const [editId,setEditId] = useState(null);       // Antrags-ID beim Ändern, sonst null
  const [fFrom,setFFrom] = useState("");
  const [fTo,setFTo] = useState("");
  const [toast,setToast] = useState(false);
  const [submitErr,setSubmitErr] = useState("");   // sichtbarer Fehler beim Einreichen
  const [authed,setAuthed] = useState(false);      // Login + DSGVO-Einwilligung bestanden?
  const [consent,setConsent] = useState(false);
  const [loginId,setLoginId] = useState("");
  const [loginPw,setLoginPw] = useState("");
  const [reminderOn,setReminderOn] = useState(false);   // Schicht-Erinnerung aktiv?
  const [lead,setLead] = useState("eve");               // Vorlauf: "eve" | "hours"
  const [leadHours,setLeadHours] = useState(2);         // 0,5–4 Std in 0,5er-Schritten
  const [notifPerm,setNotifPerm] = useState(typeof Notification!=="undefined" ? Notification.permission : "unsupported");
  const [legal,setLegal] = useState(null);          // null | "impressum" | "datenschutz"
  const [showPayslips,setShowPayslips] = useState(false);  // Lohnzettel-Overlay (auch für Meister)
  const [showAdmin,setShowAdmin] = useState(false);        // Mitarbeiterverwaltung
  const [emps,setEmps] = useState([]);
  const [teamOpts,setTeamOpts] = useState([]);
  const [aName,setAName] = useState(""); const [aEmail,setAEmail] = useState("");
  const [aPw,setAPw] = useState(""); const [aPnr,setAPnr] = useState("");
  const [aTeam,setATeam] = useState(""); const [aRole,setARole] = useState("mitarbeiter");
  const [adminErr,setAdminErr] = useState(""); const [adminOk,setAdminOk] = useState(false); const [aBusy,setABusy] = useState(false);
  const [showPw,setShowPw] = useState(false); const [pwNew,setPwNew] = useState(""); const [pwNew2,setPwNew2] = useState("");
  const [pwErr,setPwErr] = useState(""); const [pwOk,setPwOk] = useState(false); const [pwBusy,setPwBusy] = useState(false);
  const [dbProfile,setDbProfile] = useState(null);  // aus Supabase geladenes Profil
  const [authErr,setAuthErr] = useState("");
  const [busy,setBusy] = useState(false);
  const [dbReady,setDbReady] = useState(!hasSupabaseConfig);  // Demo: sofort bereit
  const [dbRequests,setDbRequests] = useState([]);  // echte Anträge aus Supabase (RLS-gefiltert)
  const t = I18N[lang];

  // "2026-07-14" -> "14.07."
  const isoToDM = (iso)=> iso ? `${iso.slice(8,10)}.${iso.slice(5,7)}.` : "—";
  // DB-Zeile -> von der UI erwartete Form
  const mapReq = (r)=>({
    id:r.id, profileId:r.profile_id, teamId:r.profile?.team_id, name:r.profile?.full_name || "—", type:r.type,
    from:isoToDM(r.start_date), to:isoToDM(r.end_date), startISO:r.start_date, endISO:r.end_date,
    days:(r.start_date&&r.end_date)?Math.max(1,Math.round((Date.parse(r.end_date)-Date.parse(r.start_date))/DAY_MS)+1):1,
    status:r.status, eau:r.type==="krank"?false:undefined,
  });
  async function loadRequests(){
    if(!hasSupabaseConfig) return;
    try{ const rows = await listRequests(); setDbRequests(rows.map(mapReq)); }
    catch(e){ console.warn("[requests]", e.message); }
  }
  // DB-Status -> App-Entscheidungscode (approved/rejected/acked) oder null (offen)
  const decOf = (r)=>{
    if(hasSupabaseConfig){
      if(r.status==="genehmigt"||r.status==="geaendert") return r.type==="krank"?"acked":"approved";
      if(r.status==="abgelehnt") return "rejected";
      return null;
    }
    return decisions[r.id] ?? null;
  };
  async function decide(id,verdict){
    if(hasSupabaseConfig){
      const status = (verdict==="approved"||verdict==="acked")?"genehmigt" : verdict==="rejected"?"abgelehnt" : "offen";
      try{ await decideRequest(id,status); setDbRequests(rs=>rs.map(x=>x.id===id?{...x,status}:x)); }
      catch(e){ console.warn("[decide]", e.message); }
      return;
    }
    setDecisions(d=>({...d,[id]:verdict}));
  }

  // Rolle aus DB (schema) -> App-Rollencode. Schichtführung (Meister/Vorarbeiter/
  // Gruppenführer) teilt sich dieselbe "meister"-Ansicht.
  const ROLE_MAP = { mitarbeiter:"ma", schichtmeister:"meister", vorarbeiter:"meister", gruppenfuehrer:"meister", betriebsleiter:"bl", personal:"hr" };
  const leadTitle = (dbProfile && {schichtmeister:t.roleMeister, vorarbeiter:t.roleVorarbeiter, gruppenfuehrer:t.roleGruppenfuehrer}[dbProfile.role]) || t.roleMeister;
  async function applyProfile(){
    const p = await getMyProfile();
    setDbProfile(p);
    setRole(ROLE_MAP[p.role] || "ma");
    const c = p.team?.name ? p.team.name.trim().slice(-1).toUpperCase() : null;
    if (c && "ABCD".includes(c)) setCrew(c);
    setAuthed(true);
    await loadRequests();
    // Team-Mitglieder + Schichten gleich mitladen (RLS: Meister -> eigenes Team, BL -> Betrieb).
    try{ const [e,tm] = await Promise.all([listEmployees(), listTeams()]); setEmps(e); setTeamOpts(tm); }
    catch(e){ console.warn("[team]", e.message); }
  }
  async function doLogin(){
    if (!hasSupabaseConfig) { setAuthed(true); return; }   // Demo-Modus ohne Backend
    setBusy(true); setAuthErr("");
    const { error } = await signIn(loginId.trim(), loginPw);
    if (error) { setBusy(false); setAuthErr(error.message); return; }
    try { await applyProfile(); }
    catch(e){ setAuthErr("Profil nicht gefunden – ist für diesen Login ein Profil angelegt?"); await signOut(); }
    setBusy(false);
  }
  const logout = ()=>{ if(hasSupabaseConfig) signOut(); setAuthed(false); setConsent(false); setLoginPw(""); setDbProfile(null); setTab(0); };

  async function openAdmin(){
    setShowAdmin(true); setAdminErr(""); setAdminOk(false);
    setAName(""); setAEmail(""); setAPw(""); setAPnr(""); setARole("mitarbeiter");
    try{
      const [e,tm] = await Promise.all([listEmployees(), listTeams()]);
      setEmps(e); setTeamOpts(tm);
      setATeam(dbProfile?.team?.id || tm[0]?.id || "");
    }catch(err){ setAdminErr(err.message); }
  }
  async function doCreateEmployee(){
    setABusy(true); setAdminErr(""); setAdminOk(false);
    const isBL = role==="bl";
    try{
      await createEmployee({
        email:aEmail.trim(), password:aPw, full_name:aName.trim(), personalnummer:aPnr.trim(),
        team_id: isBL ? aTeam : (dbProfile?.team?.id),
        role: isBL ? aRole : "mitarbeiter",
        betrieb_id: dbProfile?.betrieb_id,
      });
      setAName(""); setAEmail(""); setAPw(""); setAPnr(""); setAdminOk(true);
      setEmps(await listEmployees());
    }catch(err){ setAdminErr(err.message); }
    setABusy(false);
  }
  async function changeEmpRole(id, newRole){
    try{ await updateEmployee(id,{role:newRole}); setEmps(es=>es.map(e=>e.id===id?{...e,role:newRole}:e)); }
    catch(err){ setAdminErr(err.message); }
  }
  async function doRemoveEmp(id){
    setAdminErr("");
    try{ await removeFromTeam(id); setEmps(await listEmployees()); }
    catch(err){ setAdminErr(err.message); }
  }
  const openPw = ()=>{ setShowPw(true); setPwNew(""); setPwNew2(""); setPwErr(""); setPwOk(false); };
  async function doChangePassword(){
    setPwErr(""); setPwOk(false);
    if(pwNew.length < 6){ setPwErr(t.pwTooShort); return; }
    if(pwNew !== pwNew2){ setPwErr(t.pwMismatch); return; }
    setPwBusy(true);
    try{ await changePassword(pwNew); setPwOk(true); setPwNew(""); setPwNew2(""); }
    catch(err){ setPwErr(err.message); }
    setPwBusy(false);
  }

  // Bestehende Anmeldung beim Start laden (nur mit Supabase-Config).
  useEffect(()=>{
    if(!hasSupabaseConfig) return;
    (async()=>{
      try{ const s = await getSession(); if(s) await applyProfile(); }
      catch(e){ /* nicht eingeloggt */ }
      setDbReady(true);
    })();
  }, []);

  // Der eingeloggte Mitarbeiter (Demo): Daniel Schäfer, Schichtgruppe C.
  const EMP_NAME = "Daniel Schäfer", EMP_CREW = "C";
  const fmtDay = (iso)=>{ if(!iso) return "—"; const [,m,d] = iso.split("-"); return `${d}.${m}.`; };
  const openForm = (type)=>{ setForm(type); setEditId(null); setFFrom(""); setFTo(""); setSubmitErr(""); };
  const openEdit = (r)=>{ setForm(r.type); setEditId(r.id); setSubmitErr(""); setFFrom(r.startISO || ""); setFTo(r.endISO || ""); };
  async function withdrawRequest(id){
    if(hasSupabaseConfig){
      try{ await deleteRequest(id); await loadRequests(); }
      catch(e){ console.warn("[withdraw]", e.message); }
      return;
    }
    setSubmitted(s=>s.filter(x=>x.id!==id));
  }
  async function submitRequest(){
    const end = form==="urlaub" ? fTo : (fTo || fFrom);   // Krank ohne Enddatum = 1 Tag
    if(hasSupabaseConfig){
      setSubmitErr("");
      try{
        if(editId) await updateRequest(editId, { start_date: fFrom, end_date: end });
        else       await createRequest({ type: form, start_date: fFrom, end_date: end });
        await loadRequests();
        setForm(null); setEditId(null); setFFrom(""); setFTo(""); setToast(true);
      }catch(e){
        console.warn("[submit]", e.message);
        setSubmitErr(e.message || "Fehler beim Senden");
      }
      return;
    }
    // Demo-Modus
    const dayCount = (fFrom && fTo) ? Math.max(1, Math.round((Date.parse(fTo)-Date.parse(fFrom))/DAY_MS)+1) : 1;
    const dm = { from: fmtDay(fFrom), to: form==="urlaub" ? fmtDay(fTo) : (fTo ? fmtDay(fTo) : "—") };
    if(editId){
      setSubmitted(s=>s.map(x=>x.id===editId ? {...x, ...dm, ...(form==="urlaub"?{days:dayCount}:{})} : x));
    } else {
      setSubmitted(s=>[{ id:"own_"+form+"_"+(submitted.length+1), crew, name:(dbProfile?.full_name || EMP_NAME), type:form, ...dm, ...(form==="urlaub"?{days:dayCount}:{eau:false}) }, ...s]);
    }
    setForm(null); setEditId(null); setFFrom(""); setFTo(""); setToast(true);
  }

  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),30000); return ()=>clearInterval(id); },[]);
  useEffect(()=>{ if(!toast) return; const id=setTimeout(()=>setToast(false),2600); return ()=>clearTimeout(id); },[toast]);

  // Echte Rotation aus dem Team (Supabase). Demo: Standard-Muster ab Epoche.
  const anchorToMs = (iso)=>{ if(!iso) return 0; const [y,m,d]=iso.split("-").map(Number); return Date.UTC(y,m-1,d); };
  const rot = (hasSupabaseConfig && dbProfile?.team)
    ? { offset: dbProfile.team.rotation_offset || 0, anchorMs: anchorToMs(dbProfile.team.anchor_date) }
    : { offset: 0, anchorMs: 0 };

  const ns = nextShift(now, rot);
  const diff = ns.start.getTime() - now.getTime();
  const cdDays = Math.floor(diff/DAY_MS);
  const cdH = Math.floor((diff%DAY_MS)/3600000);
  const cdM = Math.floor((diff%3600000)/60000);
  const heroType = ns.type==="N" ? "nacht" : "tag";
  const typeLabel = ns.type==="N" ? t.nacht : t.tag;
  const timeRange = ns.type==="N" ? "17:25 – 05:25" : "05:25 – 17:25";

  // Schicht-Erinnerung: nächste Schicht + berechnete Erinnerungszeit
  const pad = (n)=> String(n).padStart(2,"0");
  const fmtH = (h)=> h.toLocaleString(lang==="tr"?"tr-TR":lang==="en"?"en-US":"de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
  const wLabel = (d)=> `${t.wk[(d.getDay()+6)%7]} ${pad(d.getDate())}.${pad(d.getMonth()+1)}.`;
  const shiftWhen = wLabel(ns.start);
  const reminderAt = lead==="eve"
    ? (()=>{ const d=new Date(ns.start); d.setDate(d.getDate()-1); d.setHours(18,0,0,0); return d; })()
    : new Date(ns.start.getTime()-leadHours*3600000);
  const remWhen = `${wLabel(reminderAt)} · ${pad(reminderAt.getHours())}:${pad(reminderAt.getMinutes())}`;
  const notifBody = `${shiftWhen} · ${typeLabel} · ${timeRange}`;
  async function toggleReminder(e){
    const on = e.target.checked; setReminderOn(on);
    if(on && typeof Notification!=="undefined" && Notification.permission==="default"){
      setNotifPerm(await Notification.requestPermission());
    }
  }
  const askNotif = ()=>{ if(typeof Notification!=="undefined") Notification.requestPermission().then(setNotifPerm); };
  const sendTestReminder = ()=>{
    if(typeof Notification!=="undefined" && Notification.permission==="granted")
      new Notification(t.reminderTitle, { body: notifBody });
  };

  // Lohnzettel: reine Anzeige (PDF vom Lohnbüro), KEINE Berechnung -> keine Haftung.
  const payslips = [];
  for(let i=1;i<=6;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    payslips.push({ y:d.getFullYear(), m:d.getMonth() });
  }

  // rotation ribbon: 8 days centered on today
  const ribbon = [];
  for(let i=0;i<8;i++){
    const d = new Date(now.getFullYear(),now.getMonth(),now.getDate()-2+i);
    ribbon.push({ t:shiftType(d, rot), today: d.toDateString()===now.toDateString(), dow:t.wk[(d.getDay()+6)%7] });
  }

  // calendar
  const calBase = new Date(now.getFullYear(), now.getMonth()+monthOff, 1);
  const yr = calBase.getFullYear(), mo = calBase.getMonth();
  const daysIn = new Date(yr,mo+1,0).getDate();
  const firstDow = (new Date(yr,mo,1).getDay()+6)%7;
  // Eigene GENEHMIGTE Abwesenheiten (für die Markierung im Plan).
  const myAbsences = hasSupabaseConfig
    ? dbRequests.filter(r=>r.profileId===dbProfile?.id && (r.status==="genehmigt"||r.status==="geaendert"))
    : submitted.filter(r=>{ const d=decisions[r.id]; return d==="approved"||d==="acked"; });
  const cells = [];
  for(let i=0;i<firstDow;i++) cells.push(null);
  for(let d=1;d<=daysIn;d++){
    const date = new Date(yr,mo,d);
    cells.push({ d, date, t:shiftType(date, rot), today:date.toDateString()===now.toDateString(), sun:isSun(date),
      abs: myAbsences.find(a=>absCoversDay(a,date)) || null });
  }
  const selDay = sel!==null ? cells.find(c=>c && c.d===sel) : cells.find(c=>c && c.today);

  const typeName = (ty)=> ty==="N"?t.nacht : ty==="T"?t.tag : t.frei;

  // Meister-Ableitungen (eigene Anträge des Mitarbeiters oben eingemischt)
  const reqs = hasSupabaseConfig ? dbRequests : [...submitted.filter(r=>r.crew===crew), ...(REQUESTS[crew] || [])];
  const pending = reqs.filter(r=>!decOf(r));
  // Team heute: echte Mitglieder aus der DB; Status aus genehmigter Abwesenheit
  // (Urlaub/Krank) bzw. der Team-Rotation (Schicht heute = Dienst, sonst frei).
  const team = hasSupabaseConfig
    ? emps.filter(e=>e.team_id && e.team_id===dbProfile?.team?.id).map(e=>{
        const abs = dbRequests.find(r=>r.profileId===e.id && (r.status==="genehmigt"||r.status==="geaendert") && absCoversDay(r, now));
        const st = abs ? (abs.type==="krank"?"sick":"vac") : (shiftType(now, rot)!=="F" ? "duty" : "off");
        return { name:e.full_name, st };
      })
    : (TEAM[crew] || []);
  const onDutyCount = team.filter(m=>m.st==="duty").length;
  const statusMap = { duty:{c:"g",k:"statusDuty"}, off:{c:"mut",k:"statusOff"}, sick:{c:"h",k:"statusSick"}, vac:{c:"s",k:"statusVac"} };

  // Betriebsleiter / Personal – werksweite Ableitungen (echt aus DB, sonst Demo-Mock)
  const crewsAll = ["A","B","C","D"];
  const crewOf = (id)=>{ const tm=teamOpts.find(x=>x.id===id); return tm ? tm.name.trim().slice(-1).toUpperCase() : "—"; };
  const absStatusMap = { approved:{c:"g",k:"stApproved"}, pending:{c:"s",k:"stPending"}, active:{c:"h",k:"stActive"} };
  // heute genehmigt-abwesende Personen-IDs (für Dienst-/Abwesenheitszählung)
  const absentTodayIds = new Set(dbRequests.filter(r=>(r.status==="genehmigt"||r.status==="geaendert") && absCoversDay(r,now)).map(r=>r.profileId));

  const crewStats = hasSupabaseConfig
    ? teamOpts.map(tm=>{
        const members = emps.filter(e=>e.team_id===tm.id);
        const worksToday = shiftType(now, {offset:tm.rotation_offset||0, anchorMs:anchorToMs(tm.anchor_date)}) !== "F";
        const absent = members.filter(m=>absentTodayIds.has(m.id)).length;
        return { c: tm.name.trim().slice(-1).toUpperCase(), total: members.length,
          duty: worksToday ? members.length-absent : 0, absent,
          open: dbRequests.filter(r=>r.teamId===tm.id && !decOf(r)).length };
      })
    : crewsAll.map(c=>({ c,
        duty:(TEAM[c]||[]).filter(m=>m.st==="duty").length, total:(TEAM[c]||[]).length,
        open:(REQUESTS[c]||[]).filter(r=>!decisions[r.id]).length, absent:(TEAM[c]||[]).filter(m=>m.st==="sick"||m.st==="vac").length,
      }));
  const plantDuty = crewStats.reduce((s,x)=>s+x.duty,0);
  const plantTotal = crewStats.reduce((s,x)=>s+x.total,0);
  const plantOpen = crewStats.reduce((s,x)=>s+x.open,0);
  const allAbsences = hasSupabaseConfig
    ? dbRequests.filter(r=>r.status==="genehmigt"||r.status==="geaendert")
        .map(r=>({ name:r.name, type:r.type, from:r.from, to:r.to, status: r.type==="krank"?"active":"approved", crew:crewOf(r.teamId) }))
    : crewsAll.flatMap(c=>(ABSENCES[c]||[]).map(a=>({...a,crew:c})));
  const allRequests = hasSupabaseConfig
    ? dbRequests.map(r=>({ ...r, crew:crewOf(r.teamId) }))
    : crewsAll.flatMap(c=>(REQUESTS[c]||[]).map(r=>({...r,crew:c})));
  const allTeam = crewsAll.flatMap(c=>(TEAM[c]||[]).map(m=>({...m,crew:c})));

  const langPicker = (
    <select className="lang-select" value={lang} onChange={e=>setLang(e.target.value)} aria-label="Sprache">
      {[["de","Deutsch"],["tr","Türkçe"],["en","English"],["ru","Русский"],["pl","Polski"]].map(([v,l])=>(
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );

  const legalSheet = legal && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setLegal(null)}><ChevronLeft size={18}/></button>
        <span className="disp">{legal==="impressum"?t.impressum:t.datenschutz}</span>
      </div>
      <div className="sheet-body">
        <div className="preview-note" style={{marginBottom:18}}>{t.legalTemplateNote}</div>
        {(legal==="impressum"?IMPRESSUM:DATENSCHUTZ).map((s,i)=>(
          <div className="legal-sec" key={i}>
            <div className="legal-h">{s.h}</div>
            <div className="legal-b">{s.b}</div>
          </div>
        ))}
        <div className="foot" style={{marginTop:24}}>PROTOTYP · OMBERA STUDIOS</div>
      </div>
    </div>
  );

  // Lohnzettel-Overlay – für jeden, der eigenen Lohn sehen darf (auch Meister).
  const payslipSheet = showPayslips && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setShowPayslips(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{t.payslipList}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="eyebrow" style={{marginBottom:12}}>{t.payslipList}</div>
          {payslips.map((p,i)=>(
            <div className="row" key={i} onClick={()=>{}}>
              <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.months[p.m]} {p.y}</span>
              <span className="row-r">{t.openPdf}<ChevronRight size={15}/></span>
            </div>
          ))}
          <div className="note"><FileText size={13} style={{flexShrink:0,marginTop:1}}/><span>{t.payslipNote}</span></div>
        </div>
        <div className="card">
          <div className="eyebrow" style={{marginBottom:12}}>{t.zeitkonto}</div>
          <div className="payrow"><span className="l">{t.gleit}</span><span className="r num" style={{color:"var(--plus)"}}>+18,5 {t.unitStd}</span></div>
          <div className="payrow"><span className="l">{t.ueber}</span><span className="r num">12,0 {t.unitStd}</span></div>
        </div>
        <div className="foot" style={{marginTop:24}}>PROTOTYP · OMBERA STUDIOS</div>
      </div>
    </div>
  );

  // Mitarbeiterverwaltung (Overlay). Betriebsleiter darf Rollen zuweisen, Meister nur Mitarbeiter anlegen.
  const ROLE_OPTS = [["mitarbeiter",t.roleMA],["schichtmeister",t.roleMeister],["vorarbeiter",t.roleVorarbeiter],["gruppenfuehrer",t.roleGruppenfuehrer],["betriebsleiter",t.roleBL],["personal",t.roleHR]];
  const adminIsBL = role==="bl";
  const selStyle = {width:"100%",padding:"12px",backgroundPosition:"right 12px center"};
  // Belegschaft nach Schichten gruppieren (Schichtführung inklusive); Teamlose separat.
  const empGroups = (()=>{
    const gs = teamOpts.map(tm=>({ key:tm.id, title:tm.name, members: emps.filter(e=>e.team_id===tm.id) }));
    const noTeam = emps.filter(e=>!e.team_id);
    if(noTeam.length) gs.push({ key:"__none", title:t.noTeamCat, members:noTeam });
    return gs;
  })();
  const adminSheet = showAdmin && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setShowAdmin(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{t.manageEmp}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="eyebrow" style={{marginBottom:12}}>{t.newEmp}</div>
          <div className="field"><label>{t.fName}</label><input value={aName} onChange={e=>setAName(e.target.value)} /></div>
          <div className="field"><label>{t.email}</label><input type="email" value={aEmail} onChange={e=>setAEmail(e.target.value)} placeholder="name@firma.de" /></div>
          <div className="field"><label>{t.password}</label><input value={aPw} onChange={e=>setAPw(e.target.value)} /></div>
          <div className="field"><label>{t.loginId}</label><input value={aPnr} onChange={e=>setAPnr(e.target.value)} inputMode="numeric" /></div>
          {adminIsBL && (
            <>
              <div className="field"><label>{t.crewLabel}</label>
                <select className="lang-select" style={selStyle} value={aTeam} onChange={e=>setATeam(e.target.value)}>
                  {teamOpts.map(tm=><option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </select>
              </div>
              <div className="field"><label>{t.roleLbl}</label>
                <select className="lang-select" style={selStyle} value={aRole} onChange={e=>setARole(e.target.value)}>
                  {ROLE_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </>
          )}
          <button className="submit" disabled={aBusy || !aName || !aEmail || !aPw} onClick={doCreateEmployee}>{aBusy?"…":t.createBtn}</button>
          {adminOk && <div className="login-note" style={{color:"var(--plus)",marginTop:10}}>{t.empCreated}</div>}
          {adminErr && <div className="login-note" style={{color:"var(--red)",marginTop:10}}>{adminErr}</div>}
          <div className="login-note" style={{marginTop:12}}>{t.adminHint}</div>
        </div>

        <div className="eyebrow" style={{margin:"4px 2px 0"}}>{t.manageEmp} · {emps.length}</div>
        {emps.length===0 && <div className="card"><div style={{color:"var(--faint)",fontSize:14}}>{t.noEmp}</div></div>}
        {empGroups.map(g=>(
          <div className="card" key={g.key}>
            <div className="eyebrow" style={{marginBottom:12}}>{g.title} · {g.members.length}</div>
            {g.members.length===0 && <div style={{color:"var(--faint)",fontSize:13}}>—</div>}
            {g.members.map(e=>(
              <div key={e.id} style={{padding:"11px 0",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div className="row-l" style={{flex:"1 1 120px"}}>
                  <span className="row-ic">{initials(e.full_name||"—")}</span>
                  <div>
                    <div style={{fontWeight:600}}>{e.full_name}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{(ROLE_OPTS.find(([v])=>v===e.role)||[])[1] || e.role}{e.personalnummer?` · ${e.personalnummer}`:""}</div>
                  </div>
                </div>
                {adminIsBL
                  ? <select className="lang-select" value={e.role} onChange={ev=>changeEmpRole(e.id,ev.target.value)}>
                      {ROLE_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  : <span className="tg mut">{(ROLE_OPTS.find(([v])=>v===e.role)||[])[1] || e.role}</span>}
                {e.id!==dbProfile?.id && (adminIsBL || e.role==="mitarbeiter") &&
                  <button className="mini-btn danger" onClick={()=>doRemoveEmp(e.id)}>{t.remove}</button>}
              </div>
            ))}
          </div>
        ))}
        <div className="foot" style={{marginTop:24}}>PROTOTYP · OMBERA STUDIOS</div>
      </div>
    </div>
  );

  const pwSheet = showPw && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setShowPw(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{t.changePw}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="field"><label>{t.newPw}</label><input type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} autoComplete="new-password" /></div>
          <div className="field"><label>{t.repeatPw}</label><input type="password" value={pwNew2} onChange={e=>setPwNew2(e.target.value)} autoComplete="new-password" /></div>
          <button className="submit" disabled={pwBusy || !pwNew || !pwNew2} onClick={doChangePassword}>{pwBusy?"…":t.save}</button>
          {pwOk && <div className="login-note" style={{color:"var(--plus)",marginTop:10}}>{t.pwChanged}</div>}
          {pwErr && <div className="login-note" style={{color:"var(--red)",marginTop:10}}>{pwErr}</div>}
        </div>
      </div>
    </div>
  );

  const myReqList = hasSupabaseConfig ? dbRequests.filter(r=>r.profileId===dbProfile?.id) : submitted;
  const myRequestsCard = myReqList.length>0 && (
    <div className="card">
      <div className="eyebrow" style={{marginBottom:12}}>{t.myReq}</div>
      {myReqList.map(r=>{
        const dec = decOf(r);
        const label = !dec ? t.stPending : dec==="approved"?t.approved : dec==="rejected"?t.rejected : t.acked;
        const cls = !dec ? "s" : dec==="rejected"?"h":"g";
        return (
          <div key={r.id} style={{padding:"13px 0",borderBottom:"1px solid var(--line)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div className="row-l">
                <span className="row-ic">{r.type==="krank"?<HeartPulse size={15}/>:<Plane size={15}/>}</span>
                <div>
                  <div style={{fontWeight:600}}>{r.type==="urlaub"?t.typeUrlaub:t.typeKrank}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{r.from}{r.to&&r.to!=="—"?" – "+r.to:""}{r.days?` · ${r.days} ${t.daysWord}`:""}</div>
                </div>
              </div>
              <span className={"tg "+cls}>{label}</span>
            </div>
            {!dec && (
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button className="mini-btn" onClick={()=>openEdit(r)}>{t.change}</button>
                <button className="mini-btn danger" onClick={()=>withdrawRequest(r.id)}>{t.withdraw}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const settingsCard = (
    <div className="card" style={{marginTop:0}}>
      <div className="row" style={{cursor:"default"}}>
        <span className="row-l"><span className="row-ic"><Languages size={16}/></span>{t.sprache}</span>
        {langPicker}
      </div>
      <div className="row">
        <span className="row-l"><span className="row-ic"><Settings size={16}/></span>{t.settings}</span>
        <ChevronRight size={16} color="var(--faint)"/>
      </div>
      {hasSupabaseConfig && (
        <div className="row" onClick={openPw}>
          <span className="row-l"><span className="row-ic"><KeyRound size={16}/></span>{t.changePw}</span>
          <ChevronRight size={16} color="var(--faint)"/>
        </div>
      )}
      <div className="row" onClick={()=>setLegal("datenschutz")}>
        <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.datenschutz}</span>
        <ChevronRight size={16} color="var(--faint)"/>
      </div>
      <div className="row" onClick={()=>setLegal("impressum")}>
        <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.impressum}</span>
        <ChevronRight size={16} color="var(--faint)"/>
      </div>
      <div className="row" onClick={logout}>
        <span className="row-l"><span className="row-ic"><LogOut size={16}/></span>{t.logout}</span>
        <ChevronRight size={16} color="var(--faint)"/>
      </div>
    </div>
  );

  const calendarView = (
    <>
      <div className="cal-hd">
        <button className="navbtn" onClick={()=>{setMonthOff(m=>m-1);setSel(null);}}><ChevronLeft size={18}/></button>
        <div className="disp">{t.months[mo]} {yr}</div>
        <button className="navbtn" onClick={()=>{setMonthOff(m=>m+1);setSel(null);}}><ChevronRight size={18}/></button>
      </div>
      <div className="wk">{t.wk.map((w,i)=><span key={i}>{w}</span>)}</div>
      <div className="grid">
        {cells.map((c,i)=> c===null
          ? <div key={i} className="cell empty"/>
          : <div key={i}
              className={`cell ${c.t}${c.today?" today":""}${sel===c.d?" sel":""}`}
              onClick={()=>setSel(c.d)}>
              {c.sun && (c.t!=="F") && <span className="sun"/>}
              <span>{c.d}</span>
              <span className="tp">{c.t==="F"?"":c.t}</span>
              {c.abs && <span className="abs-badge" style={{background:"var(--plus)"}}>{c.abs.type==="krank"?"K":"U"}</span>}
            </div>
        )}
      </div>
      <div className="legend">
        <span><i style={{background:"var(--tag)"}}/>{t.legTag}</span>
        <span><i style={{background:"var(--nacht)"}}/>{t.legNacht}</span>
        <span><i style={{background:"var(--surface2)",border:"1px solid var(--line)"}}/>{t.legFrei}</span>
      </div>
      {selDay && (
        <div className="card">
          <div style={{fontSize:12,color:"var(--muted)",fontWeight:600}}>
            {selDay.date.getDate()}. {t.months[selDay.date.getMonth()]}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:9,marginTop:8}}>
            {selDay.t==="N"?<Moon size={18} style={{color:"var(--nacht)"}}/>:selDay.t==="T"?<Sun size={18} style={{color:"var(--tag)"}}/>:<Coffee size={18} style={{color:"var(--faint)"}}/>}
            <span className="disp" style={{fontSize:18,fontWeight:600}}>{typeName(selDay.t)}</span>
          </div>
          {selDay.abs && <div style={{marginTop:10}}><span className="tg g">{(selDay.abs.type==="krank"?t.typeKrank:t.typeUrlaub)} · {t.approved}</span></div>}
          {selDay.t!=="F"
            ? <>
                <div className="num" style={{color:"var(--muted)",fontSize:14,marginTop:4}}>
                  {selDay.t==="N"?"17:25 – 05:25":"05:25 – 17:25"}
                </div>
                <div className="tags">
                  {selDay.t==="N" && <span className="tg n">{t.nachtzu} +25%</span>}
                  {selDay.sun && <span className="tg s">{t.sonntag} +75%</span>}
                </div>
              </>
            : <div style={{color:"var(--faint)",fontSize:14,marginTop:4}}>{t.noShift}</div>}
        </div>
      )}
    </>
  );

  // Türsteher: ohne Anmeldung + DSGVO-Einwilligung kein Zugang.
  // Sitzung wird geprüft (nur Supabase) -> kurzer Ladezustand
  if (hasSupabaseConfig && !dbReady) {
    return (
      <div className="app-root">
        <style>{CSS}</style>
        <div className="phone">
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <img src="/setylose-logo.svg" className="brand-logo" alt="SE Tylose" style={{height:34}} />
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="app-root">
        <style>{CSS}</style>
        <div className="phone">
          <div className="login">
            <div className="login-top">
              <img src="/setylose-logo.svg" className="brand-logo" alt="SE Tylose" />
              {langPicker}
            </div>
            <div className="login-mid">
              <div className="login-logo"><Sun size={26}/></div>
              <h1 className="disp">{t.signin}</h1>
              <p className="login-sub">{t.loginSub}</p>
              <div className="field">
                <label>{hasSupabaseConfig ? t.email : t.loginId}</label>
                <input type={hasSupabaseConfig?"email":"text"} value={loginId} onChange={e=>setLoginId(e.target.value)}
                  placeholder={hasSupabaseConfig?"name@firma.de":"10432"} inputMode={hasSupabaseConfig?"email":"numeric"} autoComplete="username" />
              </div>
              <div className="field">
                <label>{t.password}</label>
                <input type="password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} autoComplete="current-password" />
              </div>
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
                <span>{t.consentText}{" "}<a onClick={e=>{e.preventDefault(); setLegal("datenschutz");}}>{t.privacyLink}</a></span>
              </label>
              <button className="submit" disabled={!consent || !loginId || busy || (hasSupabaseConfig && !loginPw)} onClick={doLogin}>
                {busy ? "…" : t.signin}
              </button>
              {authErr && <div className="login-note" style={{color:"var(--red)"}}>{authErr}</div>}
              {!hasSupabaseConfig && <div className="login-note">{t.loginDemo}</div>}
            </div>
          </div>
          {legalSheet}
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <style>{CSS}</style>
      <div className="phone">
        {/* HEADER */}
        <div className="hdr">
          <div className="hdr-top">
            <img src="/setylose-logo.svg" className="brand-logo" alt="SE Tylose" />
          </div>
          {!hasSupabaseConfig && (
          <div className="roleseg">
            {[["ma",t.selMA],["meister",t.selMeister],["bl",t.selBL],["hr",t.selHR]].map(([r,lbl])=>(
              <button key={r} className={"rolebtn"+(role===r?" on":"")} onClick={()=>{setRole(r);setTab(0);}}>{lbl}</button>
            ))}
          </div>
          )}
          <div className="who">
            <div className="avatar">{dbProfile ? initials(dbProfile.full_name) : ({ma:"DS",meister:"KW",bl:"MB",hr:"SB"})[role]}</div>
            <div>
              <div className="who-name">{t.hi}, {dbProfile ? dbProfile.full_name.split(" ")[0] : ({ma:"Daniel",meister:"Kai",bl:"Martina",hr:"Susanne"})[role]}</div>
              <span className="chip">{role==="ma"?`${t.crewLabel} ${crew}`:role==="meister"?`${leadTitle} · ${t.crewLabel} ${crew}`:role==="bl"?`${t.roleBL} · Werk 2`:t.roleHR}</span>
            </div>
          </div>
          {role==="meister" && !hasSupabaseConfig && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,color:"var(--faint)",marginBottom:7}}>{t.crewScopeNote}</div>
              <div style={{display:"flex",gap:6}}>
                {["A","B","C","D"].map(c=>(
                  <button key={c} className={"lang"+(crew===c?" on":"")} style={{flex:1,padding:"7px 0"}} onClick={()=>{setCrew(c);}}>{c}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="body" key={tab+lang}>
          {role==="hr" && <div className="preview-note">{t.previewNote}</div>}
          {role==="ma" && tab===0 && (
            <>
              <div className={"hero "+heroType}>
                <div className="hero-glow" />
                <div className="hero-label">{t.nextShift}</div>
                <div className="hero-type">
                  {ns.type==="N" ? <Moon size={20} className="accentc"/> : <Sun size={20} className="accentc"/>}
                  <span className="disp accentc">{typeLabel}</span>
                </div>
                <div className="hero-time num">{timeRange}</div>
                <div className="count">
                  <span className="big num accentc">{cdDays>0?`${cdDays}d ${cdH}h`:`${cdH}h ${cdM}m`}</span>
                  <span className="lbl">{t.cd(cdDays,cdH,cdM)}</span>
                </div>
              </div>

              <div className="ribbon-wrap">
                <div className="eyebrow" style={{marginBottom:8}}>{t.cycle}</div>
                <div className="ribbon">
                  {ribbon.map((s,i)=>(
                    <div key={i} className={`seg ${s.t}${s.today?" today":""}`}>
                      {s.t==="F" ? "·" : s.t}
                    </div>
                  ))}
                </div>
                <div className="ribbon-cap">
                  {ribbon.map((s,i)=><span key={i}>{s.dow}</span>)}
                </div>
                <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>{t.cycleSub}</div>
              </div>

              <div className="stats">
                <div className="stat">
                  <div className="k"><Clock size={13}/>{t.saldo}</div>
                  <div className="v plus num">+18,5 {t.unitStd}</div>
                </div>
                <div className="stat">
                  <div className="k"><Plane size={13}/>{t.urlaubKonto}</div>
                  <div className="v amber num">18 {t.daysWord}</div>
                </div>
              </div>

              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="ma" && tab===1 && (
            <>
              {calendarView}
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="ma" && tab===2 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div className="eyebrow" style={{marginBottom:12}}>{t.payslipList}</div>
                {payslips.map((p,i)=>(
                  <div className="row" key={i} onClick={()=>{}}>
                    <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.months[p.m]} {p.y}</span>
                    <span className="row-r">{t.openPdf}<ChevronRight size={15}/></span>
                  </div>
                ))}
                <div className="note"><FileText size={13} style={{flexShrink:0,marginTop:1}}/><span>{t.payslipNote}</span></div>
              </div>

              <div className="card">
                <div className="eyebrow" style={{marginBottom:12}}>{t.zeitkonto}</div>
                <div className="payrow"><span className="l">{t.gleit}</span><span className="r num" style={{color:"var(--plus)"}}>+18,5 {t.unitStd}</span></div>
                <div className="payrow"><span className="l">{t.ueber}</span><span className="r num">12,0 {t.unitStd}</span></div>
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="ma" && tab===3 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                  <div>
                    <div style={{fontWeight:600,display:"flex",alignItems:"center",gap:8}}><Bell size={15}/>{t.reminderTitle}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{t.reminderSub}</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={reminderOn} onChange={toggleReminder} />
                    <span className="track"></span>
                  </label>
                </div>
                {reminderOn && (
                  <>
                    <div style={{display:"flex",gap:6,marginTop:14}}>
                      {[["eve",t.leadEve],["hours",`${t.unitStd} ${t.before}`]].map(([v,lbl])=>(
                        <button key={v} className={"lang"+(lead===v?" on":"")} style={{flex:1,padding:"8px 0"}} onClick={()=>setLead(v)}>{lbl}</button>
                      ))}
                    </div>
                    {lead==="hours" && (
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:12}}>
                        <button className="navbtn" style={{opacity:leadHours<=0.5?0.4:1}} disabled={leadHours<=0.5}
                          onClick={()=>setLeadHours(h=>Math.max(0.5,+(h-0.5).toFixed(1)))}>−</button>
                        <div className="num" style={{fontWeight:700,fontSize:16}}>{fmtH(leadHours)} {t.unitStd} {t.before}</div>
                        <button className="navbtn" style={{opacity:leadHours>=4?0.4:1}} disabled={leadHours>=4}
                          onClick={()=>setLeadHours(h=>Math.min(4,+(h+0.5).toFixed(1)))}>+</button>
                      </div>
                    )}
                    <div className="summary" style={{marginTop:14,marginBottom:0}}>
                      <div>{t.nextShift}: <b>{shiftWhen} · {typeLabel} · {timeRange}</b></div>
                      <div style={{marginTop:6}}>{t.nextReminder}: <b>{remWhen}</b></div>
                    </div>
                    {notifPerm==="granted"
                      ? <button className="ghost" style={{marginTop:12}} onClick={sendTestReminder}><Bell size={15}/>{t.testReminder}</button>
                      : notifPerm==="denied"
                        ? <div className="login-note" style={{marginTop:12,color:"#C92A2E"}}>{t.notifDenied}</div>
                        : <button className="ghost" style={{marginTop:12}} onClick={askNotif}><Bell size={15}/>{t.enableNotif}</button>}
                  </>
                )}
              </div>

              <div className="card">
                {[
                  {ic:<HeartPulse size={16}/>, label:t.krank, action:()=>openForm("krank")},
                  {ic:<Plane size={16}/>, label:t.urlaub, action:()=>openForm("urlaub")},
                  {ic:<FileText size={16}/>, label:t.docs, action:null},
                ].map((r,i)=>(
                  <div className="row" key={i} onClick={r.action||undefined} style={r.action?undefined:{cursor:"default"}}>
                    <span className="row-l"><span className="row-ic">{r.ic}</span>{r.label}</span>
                    <ChevronRight size={16} color="var(--faint)"/>
                  </div>
                ))}
              </div>

              {myRequestsCard}

              <div className="card">
                <div className="row" style={{cursor:"default"}}>
                  <span className="row-l"><span className="row-ic"><Languages size={16}/></span>{t.sprache}</span>
                  {langPicker}
                </div>
                <div className="row">
                  <span className="row-l"><span className="row-ic"><Settings size={16}/></span>{t.settings}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
                {hasSupabaseConfig && (
                  <div className="row" onClick={openPw}>
                    <span className="row-l"><span className="row-ic"><KeyRound size={16}/></span>{t.changePw}</span>
                    <ChevronRight size={16} color="var(--faint)"/>
                  </div>
                )}
                <div className="row" onClick={()=>setLegal("datenschutz")}>
                  <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.datenschutz}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
                <div className="row" onClick={()=>setLegal("impressum")}>
                  <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.impressum}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
                <div className="row" onClick={logout}>
                  <span className="row-l"><span className="row-ic"><LogOut size={16}/></span>{t.logout}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {/* ===== SCHICHTMEISTER ===== */}
          {role==="meister" && tab===0 && (
            <>
              <div className="eyebrow">{t.approvalsTitle} · {t.crewLabel} {crew}</div>
              {pending.length===0 && (
                <div className="card" style={{textAlign:"center",color:"var(--muted)",fontSize:14,padding:"30px 16px",marginTop:0}}>
                  <Check size={22} style={{color:"var(--plus)"}}/><div style={{marginTop:8}}>{t.allClear}</div>
                </div>
              )}
              {reqs.map((r,idx)=>{
                const dec = decOf(r);
                return (
                  <div className="card" key={r.id} style={{marginTop: idx===0?0:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:11}}>
                        <span className="row-ic">{initials(r.name)}</span>
                        <div>
                          <div style={{fontWeight:600,fontSize:15}}>{r.name}</div>
                          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
                            {r.from}{r.to && r.to!=="—" ? " – "+r.to : ""}{r.days? ` · ${r.days} ${t.daysWord}`:""}
                          </div>
                        </div>
                      </div>
                      <span className={"tg "+(r.type==="urlaub"?"s":"h")}>{r.type==="urlaub"?t.typeUrlaub:t.typeKrank}</span>
                    </div>
                    {r.type==="krank" && (
                      <div style={{fontSize:11,marginTop:8,color: r.eau?"var(--plus)":"var(--faint)"}}>
                        {r.eau ? "✓ "+t.eauPresent : t.eauPending}
                      </div>
                    )}
                    {!dec ? (
                      r.type==="urlaub" ? (
                        <div style={{display:"flex",gap:8,marginTop:14}}>
                          <button className="btn-approve" onClick={()=>decide(r.id,"approved")}><Check size={15}/>{t.approve}</button>
                          <button className="btn-reject" onClick={()=>decide(r.id,"rejected")}><X size={15}/>{t.reject}</button>
                        </div>
                      ) : (
                        <button className="btn-approve" style={{width:"100%",marginTop:14}} onClick={()=>decide(r.id,"acked")}><Check size={15}/>{t.ack}</button>
                      )
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14}}>
                        <div className={"decided "+dec} style={{flex:1}}>
                          {dec==="approved"?t.approved:dec==="rejected"?t.rejected:t.acked}
                        </div>
                        <button className="btn-reject" style={{flex:"0 0 auto",padding:"11px 16px"}} onClick={()=>decide(r.id,null)}>{t.change}</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="meister" && tab===1 && (
            <>
              <div className="eyebrow">{t.teamTitle} · {t.crewLabel} {crew}</div>
              <div className="card" style={{marginTop:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"var(--muted)"}}>{t.onDuty}</span>
                <span className="num" style={{fontSize:22,fontWeight:700,color:"var(--plus)"}}>{onDutyCount} / {team.length}</span>
              </div>
              <div className="card">
                {team.map((m,i)=>{
                  const s = statusMap[m.st];
                  return (
                    <div className="row" key={i} style={{cursor:"default"}}>
                      <span className="row-l"><span className="row-ic">{initials(m.name)}</span>{m.name}</span>
                      <span className={"tg "+s.c}>{t[s.k]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="meister" && tab===2 && (() => {
            const absC = hasSupabaseConfig
              ? dbRequests.filter(r=>r.status==="genehmigt"||r.status==="geaendert")
              : (ABSENCES[crew] || []);
            const acells = [];
            for(let i=0;i<firstDow;i++) acells.push(null);
            for(let d=1; d<=daysIn; d++){
              const date = new Date(yr,mo,d);
              const who = absC.filter(a=>absCoversDay(a,date));
              acells.push({ d, date, who, shift: shiftType(date, rot), today: date.toDateString()===now.toDateString() });
            }
            const selAbs = sel!==null ? acells.find(c=>c&&c.d===sel) : acells.find(c=>c&&c.today);
            return (
              <>
                <div className="eyebrow">{t.absCalTitle} · {t.crewLabel} {crew}</div>
                <div className="cal-hd">
                  <button className="navbtn" onClick={()=>{setMonthOff(m=>m-1);setSel(null);}}><ChevronLeft size={18}/></button>
                  <div className="disp">{t.months[mo]} {yr}</div>
                  <button className="navbtn" onClick={()=>{setMonthOff(m=>m+1);setSel(null);}}><ChevronRight size={18}/></button>
                </div>
                <div className="wk">{t.wk.map((w,i)=><span key={i}>{w}</span>)}</div>
                <div className="grid">
                  {acells.map((c,i)=> c===null
                    ? <div key={i} className="cell empty"/>
                    : <div key={i} className={`cell ${c.shift}${c.today?" today":""}${sel===c.d?" sel":""}`} onClick={()=>setSel(c.d)}>
                        <span>{c.d}</span>
                        <span className="tp">{c.shift==="F"?"":c.shift}</span>
                        {c.who.length>0 && <span className="abs-badge" style={{background:c.who.length>=4?"var(--red)":"var(--tag)"}}>{c.who.length}</span>}
                      </div>
                  )}
                </div>
                <div className="legend">
                  <span><i style={{background:"var(--tag)"}}/>{t.legTag}</span>
                  <span><i style={{background:"var(--nacht)"}}/>{t.legNacht}</span>
                  <span><i style={{background:"var(--red)"}}/>4+ {t.absentLbl}</span>
                </div>
                {selAbs && (
                  <div className="card">
                    <div style={{fontSize:12,color:"var(--muted)",fontWeight:600}}>{selAbs.date.getDate()}. {t.months[selAbs.date.getMonth()]}</div>
                    <div style={{display:"flex",alignItems:"center",gap:9,marginTop:8}}>
                      {selAbs.shift==="N"?<Moon size={18} style={{color:"var(--nacht)"}}/>:selAbs.shift==="T"?<Sun size={18} style={{color:"var(--tag)"}}/>:<Coffee size={18} style={{color:"var(--faint)"}}/>}
                      <span className="disp" style={{fontSize:17,fontWeight:600}}>{selAbs.shift==="N"?t.nacht:selAbs.shift==="T"?t.tag:t.frei}</span>
                      {selAbs.shift!=="F" && <span className="num" style={{color:"var(--muted)",fontSize:13,marginLeft:"auto"}}>{selAbs.shift==="N"?"17:25 – 05:25":"05:25 – 17:25"}</span>}
                    </div>
                    {selAbs.who.length===0
                      ? <div style={{color:"var(--faint)",fontSize:14,marginTop:12}}>{t.noneAbsent}</div>
                      : <>
                          {selAbs.who.length>=4 && <div style={{marginTop:12}}><span className="tg h">{t.warnMany}</span></div>}
                          <div style={{marginTop:8}}>
                            {selAbs.who.map((a,i)=>(
                              <div className="row" key={i} style={{cursor:"default"}}>
                                <span className="row-l"><span className="row-ic">{a.type==="krank"?<HeartPulse size={15}/>:<Plane size={15}/>}</span>{a.name}</span>
                                <span className={"tg "+(a.type==="krank"?"h":"s")}>{a.type==="krank"?t.typeKrank:t.typeUrlaub}</span>
                              </div>
                            ))}
                          </div>
                        </>}
                  </div>
                )}
                <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
              </>
            );
          })()}

          {role==="meister" && tab===3 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div className="eyebrow" style={{marginBottom:12}}>{t.personalArea}</div>
                <div className="row" onClick={()=>openForm("krank")}>
                  <span className="row-l"><span className="row-ic"><HeartPulse size={16}/></span>{t.krank}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
                <div className="row" onClick={()=>openForm("urlaub")}>
                  <span className="row-l"><span className="row-ic"><Plane size={16}/></span>{t.urlaub}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
                <div className="row" onClick={()=>setShowPayslips(true)}>
                  <span className="row-l"><span className="row-ic"><Wallet size={16}/></span>{t.payslipList}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              {myRequestsCard}
              <div style={{fontSize:11,color:"var(--faint)",marginTop:12,lineHeight:1.5}}>{t.selfApproveNote}</div>
              <div className="card">
                <div className="row" onClick={openAdmin}>
                  <span className="row-l"><span className="row-ic"><Users size={16}/></span>{t.manageEmp}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              <div style={{marginTop:14}}>{settingsCard}</div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {/* ===== BETRIEBSLEITER ===== */}
          {role==="bl" && tab===0 && (
            <>
              <div className="eyebrow">{t.blTitle}</div>
              <div className="stats" style={{marginTop:0}}>
                <div className="stat"><div className="k"><Users size={13}/>{t.plantDutyLbl}</div><div className="v plus num">{plantDuty} / {plantTotal}</div></div>
                <div className="stat"><div className="k"><Inbox size={13}/>{t.plantOpenLbl}</div><div className="v amber num">{plantOpen}</div></div>
              </div>
              <div className="card">
                {crewStats.map(cs=>(
                  <div className="row" key={cs.c}>
                    <div className="row-l">
                      <span className="row-ic">{cs.c}</span>
                      <div>
                        <div style={{fontWeight:600}}>{t.crewLabel} {cs.c}</div>
                        <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{cs.duty}/{cs.total} {t.statusDuty}{cs.absent>0?` · ${cs.absent} ${t.stActive}`:""}</div>
                      </div>
                    </div>
                    {cs.open>0 ? <span className="tg s">{cs.open} {t.stPending}</span> : <ChevronRight size={16} color="var(--faint)"/>}
                  </div>
                ))}
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="bl" && tab===1 && (
            <>
              <div className="eyebrow">{t.absTitle}</div>
              <div className="card" style={{marginTop:0}}>
                {allAbsences.length===0 && <div style={{color:"var(--faint)",fontSize:14}}>{t.noneAbsent}</div>}
                {allAbsences.map((a,i)=>{
                  const s = absStatusMap[a.status];
                  return (
                    <div className="row" key={i} style={{cursor:"default"}}>
                      <div className="row-l">
                        <span className="row-ic">{a.type==="krank"?<HeartPulse size={15}/>:<Plane size={15}/>}</span>
                        <div>
                          <div style={{fontWeight:600}}>{a.name} <span style={{color:"var(--faint)",fontWeight:500,fontSize:12}}>· {t.crewLabel} {a.crew}</span></div>
                          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{a.from}{a.to&&a.to!=="—"?" – "+a.to:""}</div>
                        </div>
                      </div>
                      <span className={"tg "+s.c}>{t[s.k]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="bl" && tab===2 && (
            <>
              <div className="eyebrow">{t.approvalsTitle}</div>
              <div className="card" style={{marginTop:0}}>
                {allRequests.length===0 && <div style={{color:"var(--faint)",fontSize:14}}>{t.allClear}</div>}
                {allRequests.map(r=>{
                  const dec = decOf(r);
                  const label = !dec ? t.stPending : dec==="approved"?t.approved : dec==="rejected"?t.rejected : t.acked;
                  const cls = !dec ? "s" : dec==="rejected"?"h":"g";
                  return (
                    <div className="row" key={r.id} style={{cursor:"default"}}>
                      <div className="row-l">
                        <span className="row-ic">{r.type==="krank"?<HeartPulse size={15}/>:<Plane size={15}/>}</span>
                        <div>
                          <div style={{fontWeight:600}}>{r.name} <span style={{color:"var(--faint)",fontWeight:500,fontSize:12}}>· {t.crewLabel} {r.crew}</span></div>
                          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{r.type==="urlaub"?t.typeUrlaub:t.typeKrank} · {r.from}{r.to&&r.to!=="—"?" – "+r.to:""}</div>
                        </div>
                      </div>
                      <span className={"tg "+cls}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="bl" && tab===3 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div className="row" onClick={openAdmin}>
                  <span className="row-l"><span className="row-ic"><Users size={16}/></span>{t.manageEmp}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              <div style={{marginTop:14}}>{settingsCard}</div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {/* ===== PERSONALABTEILUNG ===== */}
          {role==="hr" && tab===0 && (
            <>
              <div className="eyebrow">{t.payrollTitle} · {t.months[now.getMonth()]}</div>
              <div className="card" style={{marginTop:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>142 {t.empLbl}</div>
                    <div className="disp" style={{fontSize:22,fontWeight:700,marginTop:4,color:"var(--tag)"}}>{t.payrollStatus}</div>
                  </div>
                  <span className="tg s">118 / 142 {t.payrollDone}</span>
                </div>
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="hr" && tab===1 && (
            <>
              <div className="eyebrow">{t.timeTitle}</div>
              <div className="card" style={{marginTop:0}}>
                {TIME_ISSUES.map((ti,i)=>(
                  <div className="row" key={i}>
                    <div className="row-l">
                      <span className="row-ic"><Clock size={15}/></span>
                      <div>
                        <div style={{fontWeight:600}}>{ti.name}</div>
                        <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{ti.date} · {t[ti.key]}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--faint)"/>
                  </div>
                ))}
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="hr" && tab===2 && (
            <>
              <div className="eyebrow">{t.hrEmpTitle} · {plantTotal} {t.empLbl}</div>
              <div className="card" style={{marginTop:0}}>
                {allTeam.map((m,i)=>{
                  const s = statusMap[m.st];
                  return (
                    <div className="row" key={i} style={{cursor:"default"}}>
                      <div className="row-l">
                        <span className="row-ic">{initials(m.name)}</span>
                        <div>
                          <div style={{fontWeight:600}}>{m.name}</div>
                          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{t.crewLabel} {m.crew}</div>
                        </div>
                      </div>
                      <span className={"tg "+s.c}>{t[s.k]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="foot">PROTOTYP · OMBERA STUDIOS</div>
            </>
          )}

          {role==="hr" && tab===3 && (
            <><div style={{marginBottom:14}}>{settingsCard}</div><div className="foot">PROTOTYP · OMBERA STUDIOS</div></>
          )}
        </div>

        {/* ANTRAGS-FORMULAR (Overlay) */}
        {form && (
          <div className="sheet">
            <div className="sheet-hd">
              <button className="navbtn" onClick={()=>{setForm(null); setEditId(null);}}><ChevronLeft size={18}/></button>
              <span className="disp">{form==="urlaub"?t.urlaub:t.krank}</span>
            </div>
            <div className="sheet-body">
              <div className="summary">{form==="urlaub"?t.reqSummaryUrlaub:t.reqSummaryKrank}</div>
              <div className="field">
                <label>{t.dFrom}</label>
                <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} />
              </div>
              <div className="field">
                <label>{t.dTo}{form==="krank"?` (${t.optional})`:""}</label>
                <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} />
              </div>
              <button className="submit" disabled={!fFrom || (form==="urlaub" && !fTo)} onClick={submitRequest}>
                {editId ? t.save : t.send}
              </button>
              {submitErr && <div className="login-note" style={{color:"var(--red)",marginTop:12}}>{submitErr}</div>}
            </div>
          </div>
        )}

        {toast && <div className="toast">{t.sent}</div>}

        {/* OVERLAYS: Impressum/Datenschutz + Lohnzettel + Mitarbeiterverwaltung */}
        {legalSheet}
        {payslipSheet}
        {adminSheet}
        {pwSheet}

        {/* TABBAR */}
        <div className="tabs">
          {(() => {
            const cfg = {
              ma:      {icons:[<Home size={20}/>,<CalendarDays size={20}/>,<Wallet size={20}/>,<LayoutGrid size={20}/>], labels:t.tabs},
              meister: {icons:[<Inbox size={20}/>,<Users size={20}/>,<CalendarDays size={20}/>,<LayoutGrid size={20}/>], labels:t.mTabs},
              bl:      {icons:[<LayoutGrid size={20}/>,<Plane size={20}/>,<Inbox size={20}/>,<Settings size={20}/>], labels:t.blTabs},
              hr:      {icons:[<Wallet size={20}/>,<Clock size={20}/>,<Users size={20}/>,<Settings size={20}/>], labels:t.hrTabs},
            }[role];
            return cfg.icons.map((ic,i)=>(
              <button key={i} className={"tab"+(tab===i?" on":"")} onClick={()=>setTab(i)}>
                <span className="tab-ic">{ic}</span>
                {role==="meister" && i===0 && pending.length>0 && <span className="badge">{pending.length}</span>}
                {role==="bl" && i===2 && plantOpen>0 && <span className="badge">{plantOpen}</span>}
                {cfg.labels[i]}
              </button>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
