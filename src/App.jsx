import React, { useState, useEffect } from "react";
import {
  Home, CalendarDays, Wallet, LayoutGrid, Sun, Moon,
  FileText, Plane, HeartPulse, Languages, ChevronRight, ChevronLeft,
  Clock, Settings, Coffee, Users, Inbox, Check, X, LogOut, Bell, KeyRound, PenSquare, Paperclip, Download, Eye, EyeOff, Building2, Eraser, Grid3x3
} from "lucide-react";
import { hasSupabaseConfig } from "./lib/supabase";
import { downloadAbsencePdf } from "./lib/absencePdf";
import { GUIDE } from "./lib/guide";
import { signIn, emailForPnr, signOut, getSession, getMyProfile, listRequests, createRequest, updateRequest, deleteRequest, decideRequest,
  listTeams, listEmployees, createEmployee, updateEmployee, removeFromTeam, changePassword, sendPasswordReset,
  listMessages, sendMessage, markMessageRead, uploadMessageFile, messageFileUrl, deleteMessage, myLeadership, leadershipContacts,
  listPayslips, payslipUrl, uploadPayslip, listAssignments, listAssignmentsRange, setAssignment, teamAssignments, companyDirectory, companyTeams, companyRequests, companyOverview, teamLeaveCounts } from "./lib/data";

/* ============================================================
   PROTOTYP — Mitarbeiter-App für Chemie-Schichtbetrieb (12h Vollkonti)
   Rotation: 1 Tag · 1 Nacht · 2 frei  ·  Schichtgruppe C
   Signature: Tag/Nacht-Farbcode + persönliches Rotations-Band
   ============================================================ */

const PATTERN = ["T", "N", "F", "F"]; // 4-Tage-Zyklus: 1 Tag · 1 Nacht · 2 frei
const URLAUB_TAGE = 28;               // Standard-Jahresurlaub (Resturlaub-Anzeige)
const STATIONS = ["Messwarte","Mahltrocknung","Alkylierer","Zellstoff","Neubau","Absack","Mischerei","Tylomix","Sauber","ZBV"];
const ABSENT = "Abwesend";
const STATION_COLOR = { Messwarte:"#3358d4", Mahltrocknung:"#d99a6a", Alkylierer:"#d24b45", Zellstoff:"#57a94e", Neubau:"#dbd24a", Absack:"#54b7cb", Mischerei:"#c14fc0", Tylomix:"#5a221f", Sauber:"#9b9b9b", ZBV:"#d8b24c", [ABSENT]:"#e3ded3" };
const stColor = (s)=> STATION_COLOR[s] || "#eef2f5";
const stText = (s)=>{ const hex=STATION_COLOR[s]; if(!hex) return "#5b6b78"; const h=hex.replace("#",""); const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16); return (0.299*r+0.587*g+0.114*b)>150 ? "#1a2733" : "#fff"; };
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
  display:flex; justify-content:center; background:#e9edf1; height:100%; overflow:hidden; overscroll-behavior:none; padding:0;
}
/* Dunkelmodus: nur die Farb-Variablen überschreiben – Layout bleibt gleich. */
.app-root.theme-dark{
  --bg:#12161B; --surface:#1B222A; --surface2:#232C35; --line:#2C3742;
  --text:#E9EEF3; --muted:#9BA7B2; --faint:#6C7883;
  --tag:#E0902E; --tag-soft:rgba(224,144,46,.16); --tag-glow:rgba(224,144,46,.20);
  --nacht:#57A8DE; --nacht-soft:rgba(87,168,222,.16); --nacht-glow:rgba(87,168,222,.20);
  --frei:#3B4650; --plus:#43BE77; --plus-soft:rgba(67,190,119,.16);
  --accent:#2BB4C9; --red:#E86063; --red-soft:rgba(232,96,99,.16);
  background:#0B0E12; color-scheme:dark;
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
.cell.pick{background:var(--plus) !important; border-color:var(--plus) !important; color:#fff !important;}
.cell.pick .tp,.cell.pick .dot{color:#fff !important;}
.cell .dot{width:6px; height:6px; border-radius:50%; margin-top:2px;}
.cell.pick .dot{background:rgba(255,255,255,.9) !important;}
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
.tabs{flex-shrink:0; display:flex;
  background:var(--bg); border-top:1px solid var(--line); padding:8px 6px calc(12px + env(safe-area-inset-bottom));}
.tab{flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:none; cursor:pointer;
  color:var(--faint); font-size:10px; font-weight:600; transition:.15s;}
.tab.on{color:var(--text);}
.tab.on .tab-ic{color:var(--accent);}

.foot{text-align:center; font-size:11px; color:var(--faint); margin-top:22px; letter-spacing:.05em;}

.preview-note{background:var(--tag-soft); border:1px solid rgba(199,122,10,.25); color:var(--tag);
  border-radius:10px; padding:9px 12px; margin-bottom:14px; font-size:11.5px; font-weight:600; letter-spacing:.01em;}
.cat-h{font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); font-weight:700; margin:12px 2px 3px;}

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
.pw-wrap{position:relative; display:flex;}
.pw-wrap input{padding-right:46px;}
.pw-toggle{position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none;
  color:var(--muted); cursor:pointer; padding:8px; display:flex; align-items:center; border-radius:8px;}
.pw-toggle:hover{color:var(--text);}
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

/* Arbeitsplatz-Einteilung: Raster */
.agrid{width:100%; border-collapse:collapse; font-size:13px; min-width:520px;}
.agrid th{background:var(--surface); color:var(--text); font-weight:700; font-size:12.5px; padding:11px 8px; border-bottom:1px solid var(--line); border-left:1px solid var(--line); text-align:center; white-space:nowrap;}
.agrid th:first-child{border-left:none; position:sticky; left:0; z-index:2; text-align:left;}
.agrid td{border-bottom:1px solid var(--line); border-left:1px solid var(--line); text-align:center;}
.agrid td:first-child{border-left:none; padding:0 12px; color:var(--text); background:var(--bg); position:sticky; left:0; z-index:1; white-space:nowrap;}
.agrid tr:last-child td{border-bottom:none;}

/* ===== DESKTOP-ANSICHT für Führungsrollen (PC) – Seitenleiste + breiter Inhalt ===== */
@media (min-width: 900px){
  .app-root.mgmt{ padding:0; background:var(--surface); }
  .app-root.mgmt .phone{
    max-width:1180px; width:100%; height:100%; box-shadow:0 0 60px rgba(0,0,0,.10);
    display:grid; grid-template-columns:236px 1fr; grid-template-rows:auto 1fr;
    grid-template-areas:"side head" "side main";
  }
  .app-root.mgmt .hdr{ grid-area:head; }
  .app-root.mgmt .body{ grid-area:main; padding:22px 30px 30px; }
  .app-root.mgmt .body > *{ max-width:900px; }
  /* Tab-Leiste -> vertikale Seitenleiste */
  .app-root.mgmt .tabs{
    grid-area:side; display:flex; flex-direction:column; align-items:stretch; gap:4px;
    border-top:none; border-right:1px solid var(--line); background:var(--surface);
    padding:16px 12px calc(16px + env(safe-area-inset-bottom)); height:100%;
  }
  .app-root.mgmt .tabs .tab{
    flex-direction:row; justify-content:flex-start; gap:12px; width:100%;
    padding:12px 14px; border-radius:11px; font-size:14px; font-weight:600; color:var(--muted);
  }
  .app-root.mgmt .tabs .tab.on{ background:var(--surface2); color:var(--accent); }
  .app-root.mgmt .tabs .tab .tab-ic{ margin:0; }
  .app-root.mgmt .tabs .tab .badge{ position:static; margin-left:auto; right:auto; top:auto; }
}
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
    myReq:"Meine Anträge", reqSummaryUrlaub:"Wähle deinen Zeitraum im Kalender. Nach dem Absenden geht der Antrag an deinen Schichtmeister zur Freigabe – verbindlich über deinen Login, ohne Unterschrift.",
    reqSummaryKrank:"Krankmeldung geht an deinen Schichtmeister. Die eAU kommt separat von der Krankenkasse.",
    legLeave:"Kollege im Urlaub", shiftDayWord:"Schichttag", shiftDaysWord:"Schichttage", bindingRequest:"Verbindlich beantragen",
    overlapNote:(d,k)=>`An ${d} ${d===1?"Tag":"Tagen"} deiner Auswahl ${k===1?"ist schon 1 Kollege":`sind schon ${k} Kollegen`} aus deinem Team im Urlaub – es könnte knapp mit der Besetzung werden.`,
    sprache:"Sprache", settings:"Einstellungen", appearance:"Darstellung", guideTitle:"Anleitung", guideSub:"Kurz erklärt: was du wo machst. Thema antippen zum Aufklappen.", light:"Hell", dark:"Dunkel", searchEmp:"Mitarbeiter suchen",
    cd:(d,h,m)=> d>0 ? `in ${d} Tg ${h} Std` : `in ${h} Std ${m} Min`,
    unitStd:"Std",
    roleMA:"Mitarbeiter", roleMeister:"Schichtmeister", roleVorarbeiter:"Vorarbeiter", roleGruppenfuehrer:"Gruppenführer", crewLabel:"Schicht",
    crewScopeNote:"Prototyp – im 4-Schicht-System sieht jeder Meister nur sein eigenes Team.",
    mTabs:["Anträge","Team","Einteilung","Kalender","Mehr"], approvalsTitle:"Offene Anträge",
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
    manageEmp:"Mitarbeiter", manageEmpMenu:"Mitarbeiter anlegen", newEmp:"Neuer Mitarbeiter", fName:"Name", roleLbl:"Rolle", createBtn:"Anlegen", empCreated:"Mitarbeiter angelegt ✓", noEmp:"Noch keine Mitarbeiter", noTeamCat:"Ohne Schicht", adminHint:"Anmeldung später mit E-Mail + Start-Passwort.",
    changePw:"Passwort ändern", newPw:"Neues Passwort", repeatPw:"Wiederholen", pwChanged:"Passwort geändert ✓", pwMismatch:"Passwörter stimmen nicht überein", pwTooShort:"Mindestens 6 Zeichen", remove:"Entfernen",
    forgotLink:"Passwort vergessen?", forgotTitle:"Passwort zurücksetzen", forgotSub:"Gib deine E-Mail ein – wir senden dir einen Link zum Zurücksetzen.", sendResetBtn:"Link senden", resetSent:"E-Mail gesendet – prüfe dein Postfach (auch Spam).", setNewPw:"Neues Passwort setzen", setNewPwSub:"Wähle ein neues Passwort für deinen Zugang.",
    postfach:"Postfach", newMsg:"Neue Nachricht", noMsg:"Keine Nachrichten", toLabel:"An", plantWide:"Werksweit (alle)", myShift:"Meine Schicht", toPerson:"Person", allPlants:"Alle Betriebe", wholePlant:"Ganzer Betrieb", recipientLbl:"Empfänger", personalMsg:"Persönlich", pickRecipient:"Bitte Empfänger wählen.", subjectLabel:"Betreff", msgBody:"Nachricht", sendMsg:"Senden", addFile:"Datei/Foto", fileTooBig:"Datei zu groß (max. 10 MB)", deleteMsg:"Löschen", reallyDelete:"Wirklich löschen?", reply:"Antworten", leadershipLabel:"Leitung / Personal", maSendHint:"Nur an deine Schichtführung oder Betriebsleitung.",
    uploadTitle:"Lohnzettel hochladen", bulkTitle:"Sammel-Upload", bulkHint:"Mehrere PDFs auf einmal – die Personalnummer muss im Dateinamen stehen (z. B. 10007.pdf).", pickPdfs:"PDFs wählen", bulkBtn:"Alle hochladen", bulkDone:"zugeordnet", bulkNoMatch:"ohne Treffer", periodLabel:"Monat", pickPdf:"PDF wählen", uploadBtn:"Hochladen", uploadOk:"Hochgeladen ✓", noPayslips:"Noch keine Lohnzettel", pdfOnly:"Nur PDF-Dateien",
    einteilung:"Deine Einteilung", notAssigned:"Noch nicht eingeteilt", assignHint:"Bereich je Mitglied wählen (Einteilung)", teamTodayLabel:"Team heute", workAssign:"Arbeitsplatzeinteilung", workHint1:"Arbeitsplatz:", workHint2:"– jetzt Felder antippen.", eraser:"Radierer", copyWeek:"Erste Spalte auf Woche übernehmen", clearAssign:"Einteilung löschen",
    absTitle:"Urlaubsplan & Abwesenheiten",
    stApproved:"Genehmigt", stPending:"Offen", stActive:"Aktiv",
    blTabs:["Übersicht","Abwesend","Anträge","Einteilung","Mehr"], blTitle:"GLUTOLIN Betrieb · Alle Schichten",
    plantDutyLbl:"Im Dienst", plantOpenLbl:"Offene Anträge",
    hrTabs:["Lohnlauf","Betriebe","Anträge","Mehr"], roleAssistent:"Betriebsassistent", catFuehrung:"Schichtführung", catBelegschaft:"Belegschaft", noBetriebEmp:"Noch keine Zuordnung", newLeitung:"Leitung anlegen", hrTeam:"HR-Team", hrOverview:"Anträge & Abwesenheiten", presenceToday:"Heute", writeMsg:"Nachricht schreiben", sendPayslip:"Lohnzettel senden", absenceSlip:"Abwesenheitsnachweis (PDF)", reallyRemove:"Wirklich entfernen?", reallyWithdraw:"Wirklich zurückziehen?", yes:"Ja", no:"Nein", betriebLbl:"Betrieb", leitungHint:"Betriebsleiter und Betriebsassistent haben dieselben Rechte.",
    payrollTitle:"Lohnlauf", payrollStatus:"In Prüfung", payrollDone:"geprüft",
    empLbl:"Mitarbeiter", timeTitle:"Zeitkorrekturen", hrEmpTitle:"Belegschaft", exportDatev:"Export an DATEV",
    tiMissOut:"Ausstempeln fehlt", tiMissIn:"Einstempeln fehlt", tiBreak:"Pause unplausibel",
    previewNote:"Phase 3 · Vorschau – im Pilotbetrieb noch nicht aktiv.",
    signin:"Anmelden", loginSub:"Melde dich mit Personalnummer oder E-Mail an.",
    loginId:"Personalnummer", loginIdEmail:"Personalnummer oder E-Mail", pnrNotFound:"Personalnummer nicht gefunden.", accountDisabled:"Konto deaktiviert – bitte an die Personalabteilung wenden.", email:"E-Mail", password:"Passwort", pwShow:"Passwort anzeigen", pwHide:"Passwort verbergen",
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
    myReq:"Taleplerim", reqSummaryUrlaub:"Takvimde dönemini seç. Gönderdikten sonra talep onay için vardiya amirine gider – girişinle bağlayıcı, imzasız.",
    reqSummaryKrank:"Hastalık bildirimi vardiya amirine gider. eAU ayrıca sigortadan gelir.",
    legLeave:"İzinde meslektaş", shiftDayWord:"vardiya günü", shiftDaysWord:"vardiya günü", bindingRequest:"Bağlayıcı talep et",
    overlapNote:(d,k)=>`Seçiminde ${d} gün ekibinden ${k} meslektaş zaten izinde – doluluk sıkışabilir.`,
    sprache:"Dil", settings:"Ayarlar", appearance:"Görünüm", guideTitle:"Kılavuz", guideSub:"Kısaca: neyi nerede yaparsın. Açmak için konuya dokun.", light:"Açık", dark:"Koyu", searchEmp:"Personel ara",
    cd:(d,h,m)=> d>0 ? `${d} gün ${h} sa sonra` : `${h} sa ${m} dk sonra`,
    unitStd:"sa",
    roleMA:"Çalışan", roleMeister:"Vardiya amiri", roleVorarbeiter:"Kısım başı", roleGruppenfuehrer:"Grup lideri", crewLabel:"Vardiya",
    crewScopeNote:"Prototip – 4 vardiyalı sistemde her ustabaşı yalnızca kendi ekibini görür.",
    mTabs:["Talepler","Ekip","Yerleşim","Takvim","Diğer"], approvalsTitle:"Bekleyen talepler",
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
    manageEmp:"Çalışanlar", manageEmpMenu:"Personel ekle", newEmp:"Yeni çalışan", fName:"Ad", roleLbl:"Rol", createBtn:"Oluştur", empCreated:"Çalışan oluşturuldu ✓", noEmp:"Henüz çalışan yok", noTeamCat:"Vardiyasız", adminHint:"Giriş: e-posta + başlangıç şifresi.",
    changePw:"Şifre değiştir", newPw:"Yeni şifre", repeatPw:"Tekrar", pwChanged:"Şifre değiştirildi ✓", pwMismatch:"Şifreler eşleşmiyor", pwTooShort:"En az 6 karakter", remove:"Çıkar",
    forgotLink:"Şifreni mi unuttun?", forgotTitle:"Şifre sıfırlama", forgotSub:"E-postanı gir – sıfırlama bağlantısı göndereceğiz.", sendResetBtn:"Bağlantı gönder", resetSent:"E-posta gönderildi – gelen kutunu kontrol et (spam de).", setNewPw:"Yeni şifre belirle", setNewPwSub:"Girişin için yeni bir şifre seç.",
    postfach:"Gelen kutusu", newMsg:"Yeni mesaj", noMsg:"Mesaj yok", toLabel:"Kime", plantWide:"Tüm işletme", myShift:"Vardiyam", toPerson:"Kişi", allPlants:"Tüm işletmeler", wholePlant:"Tüm işletme", recipientLbl:"Alıcı", personalMsg:"Kişisel", pickRecipient:"Lütfen alıcı seçin.", subjectLabel:"Konu", msgBody:"Mesaj", sendMsg:"Gönder", addFile:"Dosya/Foto", fileTooBig:"Dosya çok büyük (maks. 10 MB)", deleteMsg:"Sil", reallyDelete:"Gerçekten sil?", reply:"Yanıtla", leadershipLabel:"Yönetim / Personel", maSendHint:"Sadece vardiya amirine veya işletme müdürüne.",
    uploadTitle:"Maaş bordrosu yükle", bulkTitle:"Toplu yükleme", bulkHint:"Birden çok PDF – personel numarası dosya adında olmalı (örn. 10007.pdf).", pickPdfs:"PDF seç", bulkBtn:"Hepsini yükle", bulkDone:"atandı", bulkNoMatch:"eşleşme yok", periodLabel:"Ay", pickPdf:"PDF seç", uploadBtn:"Yükle", uploadOk:"Yüklendi ✓", noPayslips:"Henüz bordro yok", pdfOnly:"Sadece PDF dosyaları",
    einteilung:"Görev yerin", notAssigned:"Henüz atanmadı", assignHint:"Her üye için bölüm seç", teamTodayLabel:"Bugün ekip", workAssign:"İş yeri planı", workHint1:"İş yeri:", workHint2:"– şimdi alanlara dokun.", eraser:"Silgi", copyWeek:"İlk sütunu haftaya uygula", clearAssign:"Planı sil",
    absTitle:"İzin planı & devamsızlıklar",
    stApproved:"Onaylı", stPending:"Bekliyor", stActive:"Aktif",
    blTabs:["Genel","Devamsız","Talepler","Yerleşim","Diğer"], blTitle:"GLUTOLIN Betrieb · Tüm vardiyalar",
    plantDutyLbl:"Görevde", plantOpenLbl:"Bekleyen talep",
    hrTabs:["Bordro","İşletmeler","Talepler","Diğer"], roleAssistent:"İşletme asistanı", catFuehrung:"Vardiya yönetimi", catBelegschaft:"Çalışanlar", noBetriebEmp:"Henüz atama yok", newLeitung:"Yönetim ekle", hrTeam:"İK ekibi", hrOverview:"Talepler & Devamsızlık", presenceToday:"Bugün", writeMsg:"Mesaj yaz", sendPayslip:"Bordro gönder", absenceSlip:"Devamsızlık belgesi (PDF)", reallyRemove:"Gerçekten kaldır?", reallyWithdraw:"Gerçekten geri çek?", yes:"Evet", no:"Hayır", betriebLbl:"İşletme", leitungHint:"Betriebsleiter ve Asistan aynı haklara sahiptir.",
    payrollTitle:"Bordro dönemi", payrollStatus:"İncelemede", payrollDone:"incelendi",
    empLbl:"çalışan", timeTitle:"Zaman düzeltmeleri", hrEmpTitle:"Kadro", exportDatev:"DATEV'e aktar",
    tiMissOut:"Çıkış eksik", tiMissIn:"Giriş eksik", tiBreak:"Mola tutarsız",
    previewNote:"3. Faz · Önizleme – pilot işletmede henüz aktif değil.",
    signin:"Giriş", loginSub:"Personel numarası veya e-posta ile giriş yap.",
    loginId:"Personel numarası", loginIdEmail:"Personel numarası veya e-posta", pnrNotFound:"Personel numarası bulunamadı.", accountDisabled:"Hesap devre dışı – lütfen İK ile iletişime geçin.", email:"E-posta", password:"Şifre", pwShow:"Şifreyi göster", pwHide:"Şifreyi gizle",
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
    myReq:"My requests", reqSummaryUrlaub:"Pick your dates in the calendar. After sending, the request goes to your shift supervisor for approval – binding via your login, no signature.",
    reqSummaryKrank:"Your sick note goes to your shift supervisor. The eAU arrives separately from your health insurer.",
    legLeave:"Colleague on leave", shiftDayWord:"shift day", shiftDaysWord:"shift days", bindingRequest:"Submit bindingly",
    overlapNote:(d,k)=>`On ${d} day${d===1?"":"s"} of your selection ${k===1?"1 colleague is":`${k} colleagues are`} already on leave – staffing could get tight.`,
    sprache:"Language", settings:"Settings", appearance:"Appearance", guideTitle:"Guide", guideSub:"In short: what to do where. Tap a topic to expand.", light:"Light", dark:"Dark", searchEmp:"Search employee",
    cd:(d,h,m)=> d>0 ? `in ${d}d ${h}h` : `in ${h}h ${m}min`,
    unitStd:"h",
    roleMA:"Employee", roleMeister:"Shift supervisor", roleVorarbeiter:"Foreman", roleGruppenfuehrer:"Group leader", crewLabel:"Crew",
    crewScopeNote:"Prototype – in a 4-crew system each supervisor sees only their own team.",
    mTabs:["Requests","Team","Assignment","Calendar","More"], approvalsTitle:"Open requests",
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
    manageEmp:"Employees", manageEmpMenu:"Add employee", newEmp:"New employee", fName:"Name", roleLbl:"Role", createBtn:"Create", empCreated:"Employee created ✓", noEmp:"No employees yet", noTeamCat:"No shift", adminHint:"Login later with email + starting password.",
    changePw:"Change password", newPw:"New password", repeatPw:"Repeat", pwChanged:"Password changed ✓", pwMismatch:"Passwords do not match", pwTooShort:"At least 6 characters", remove:"Remove",
    forgotLink:"Forgot password?", forgotTitle:"Reset password", forgotSub:"Enter your email – we'll send you a reset link.", sendResetBtn:"Send link", resetSent:"Email sent – check your inbox (and spam).", setNewPw:"Set new password", setNewPwSub:"Choose a new password for your account.",
    postfach:"Inbox", newMsg:"New message", noMsg:"No messages", toLabel:"To", plantWide:"Plant-wide (all)", myShift:"My shift", toPerson:"Person", allPlants:"All plants", wholePlant:"Whole plant", recipientLbl:"Recipient", personalMsg:"Personal", pickRecipient:"Please choose a recipient.", subjectLabel:"Subject", msgBody:"Message", sendMsg:"Send", addFile:"File/Photo", fileTooBig:"File too large (max. 10 MB)", deleteMsg:"Delete", reallyDelete:"Really delete?", reply:"Reply", leadershipLabel:"Management / HR", maSendHint:"Only to your shift lead or plant manager.",
    uploadTitle:"Upload payslip", bulkTitle:"Bulk upload", bulkHint:"Several PDFs at once – the personnel number must be in the file name (e.g. 10007.pdf).", pickPdfs:"Choose PDFs", bulkBtn:"Upload all", bulkDone:"assigned", bulkNoMatch:"no match", periodLabel:"Month", pickPdf:"Choose PDF", uploadBtn:"Upload", uploadOk:"Uploaded ✓", noPayslips:"No payslips yet", pdfOnly:"PDF files only",
    einteilung:"Your assignment", notAssigned:"Not yet assigned", assignHint:"Choose a station per member", teamTodayLabel:"Team today", workAssign:"Workplace assignment", workHint1:"Workplace:", workHint2:"– now tap the cells.", eraser:"Eraser", copyWeek:"Apply first column to week", clearAssign:"Clear assignment",
    absTitle:"Leave plan & absences",
    stApproved:"Approved", stPending:"Pending", stActive:"Active",
    blTabs:["Overview","Absences","Requests","Assignment","More"], blTitle:"GLUTOLIN Betrieb · All crews",
    plantDutyLbl:"On duty", plantOpenLbl:"Open requests",
    hrTabs:["Payroll","Plants","Requests","More"], roleAssistent:"Plant assistant", catFuehrung:"Shift leads", catBelegschaft:"Workforce", noBetriebEmp:"No one assigned yet", newLeitung:"Add management", hrTeam:"HR team", hrOverview:"Requests & absences", presenceToday:"Today", writeMsg:"Write message", sendPayslip:"Send payslip", absenceSlip:"Absence record (PDF)", reallyRemove:"Really remove?", reallyWithdraw:"Really withdraw?", yes:"Yes", no:"No", betriebLbl:"Plant", leitungHint:"Plant manager and assistant have the same rights.",
    payrollTitle:"Payroll run", payrollStatus:"In review", payrollDone:"reviewed",
    empLbl:"employees", timeTitle:"Time corrections", hrEmpTitle:"Workforce", exportDatev:"Export to DATEV",
    tiMissOut:"Missing clock-out", tiMissIn:"Missing clock-in", tiBreak:"Break implausible",
    previewNote:"Phase 3 · Preview – not active in the pilot.",
    signin:"Sign in", loginSub:"Sign in with your personnel number or email.",
    loginId:"Personnel number", loginIdEmail:"Personnel number or email", pnrNotFound:"Personnel number not found.", accountDisabled:"Account disabled – please contact HR.", email:"Email", password:"Password", pwShow:"Show password", pwHide:"Hide password",
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
    myReq:"Мои заявки", reqSummaryUrlaub:"Выбери период в календаре. После отправки заявка идёт бригадиру на согласование – обязывающе через твой вход, без подписи.",
    reqSummaryKrank:"Больничный отправляется бригадиру. eAU приходит отдельно из больничной кассы.",
    legLeave:"Коллега в отпуске", shiftDayWord:"смен. день", shiftDaysWord:"смен. дней", bindingRequest:"Подать заявку",
    overlapNote:(d,k)=>`В ${d} дн. твоего выбора уже ${k===1?"1 коллега":`${k} коллег(и)`} в отпуске – с укомплектованностью может быть тесно.`,
    sprache:"Язык", settings:"Настройки", appearance:"Оформление", guideTitle:"Инструкция", guideSub:"Кратко: что и где делать. Нажми тему, чтобы раскрыть.", light:"Светлая", dark:"Тёмная", searchEmp:"Поиск сотрудника",
    cd:(d,h,m)=> d>0 ? `через ${d} дн ${h} ч` : `через ${h} ч ${m} мин`,
    unitStd:"ч",
    roleMA:"Сотрудник", roleMeister:"Сменный мастер", roleVorarbeiter:"Старший рабочий", roleGruppenfuehrer:"Руководитель группы", crewLabel:"Смена",
    crewScopeNote:"Прототип – в системе из 4 смен каждый бригадир видит только свою бригаду.",
    mTabs:["Заявки","Бригада","Расстановка","Календарь","Ещё"], approvalsTitle:"Открытые заявки",
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
    manageEmp:"Сотрудники", manageEmpMenu:"Добавить сотрудника", newEmp:"Новый сотрудник", fName:"Имя", roleLbl:"Роль", createBtn:"Создать", empCreated:"Сотрудник создан ✓", noEmp:"Пока нет сотрудников", noTeamCat:"Без смены", adminHint:"Вход: эл. почта + стартовый пароль.",
    changePw:"Сменить пароль", newPw:"Новый пароль", repeatPw:"Повторите", pwChanged:"Пароль изменён ✓", pwMismatch:"Пароли не совпадают", pwTooShort:"Минимум 6 символов", remove:"Убрать",
    forgotLink:"Забыли пароль?", forgotTitle:"Сброс пароля", forgotSub:"Введите e-mail – мы отправим ссылку для сброса.", sendResetBtn:"Отправить ссылку", resetSent:"Письмо отправлено – проверьте почту (и спам).", setNewPw:"Задать новый пароль", setNewPwSub:"Выберите новый пароль для входа.",
    postfach:"Входящие", newMsg:"Новое сообщение", noMsg:"Нет сообщений", toLabel:"Кому", plantWide:"Весь завод", myShift:"Моя смена", toPerson:"Человек", allPlants:"Все заводы", wholePlant:"Весь завод", recipientLbl:"Получатель", personalMsg:"Лично", pickRecipient:"Выберите получателя.", subjectLabel:"Тема", msgBody:"Сообщение", sendMsg:"Отправить", addFile:"Файл/Фото", fileTooBig:"Файл слишком большой (макс. 10 МБ)", deleteMsg:"Удалить", reallyDelete:"Точно удалить?", reply:"Ответить", leadershipLabel:"Руководство / Кадры", maSendHint:"Только руководству смены или завода.",
    uploadTitle:"Загрузить расчётный лист", bulkTitle:"Массовая загрузка", bulkHint:"Несколько PDF сразу – табельный номер должен быть в имени файла (напр. 10007.pdf).", pickPdfs:"Выбрать PDF", bulkBtn:"Загрузить все", bulkDone:"назначено", bulkNoMatch:"без совпадения", periodLabel:"Месяц", pickPdf:"Выбрать PDF", uploadBtn:"Загрузить", uploadOk:"Загружено ✓", noPayslips:"Пока нет расчётных листов", pdfOnly:"Только файлы PDF",
    einteilung:"Твоё назначение", notAssigned:"Ещё не назначено", assignHint:"Выбери участок для каждого", teamTodayLabel:"Команда сегодня", workAssign:"Расстановка по местам", workHint1:"Место:", workHint2:"– нажимай ячейки.", eraser:"Ластик", copyWeek:"Первый столбец на неделю", clearAssign:"Очистить",
    absTitle:"План отпусков и отсутствия",
    stApproved:"Одобрено", stPending:"Ожидает", stActive:"Активно",
    blTabs:["Обзор","Отсутствия","Заявки","Расстановка","Ещё"], blTitle:"GLUTOLIN Betrieb · Все смены",
    plantDutyLbl:"На смене", plantOpenLbl:"Открытые заявки",
    hrTabs:["Зарплата","Заводы","Заявки","Ещё"], roleAssistent:"Ассистент предприятия", catFuehrung:"Руководство смены", catBelegschaft:"Работники", noBetriebEmp:"Пока никто не назначен", newLeitung:"Добавить руководство", hrTeam:"Отдел кадров", hrOverview:"Заявки и отсутствия", presenceToday:"Сегодня", writeMsg:"Написать сообщение", sendPayslip:"Отправить расчётный лист", absenceSlip:"Справка об отсутствии (PDF)", reallyRemove:"Точно удалить?", reallyWithdraw:"Точно отозвать?", yes:"Да", no:"Нет", betriebLbl:"Завод", leitungHint:"Руководитель и ассистент имеют одинаковые права.",
    payrollTitle:"Расчёт зарплаты", payrollStatus:"На проверке", payrollDone:"проверено",
    empLbl:"сотрудников", timeTitle:"Корректировки времени", hrEmpTitle:"Персонал", exportDatev:"Экспорт в DATEV",
    tiMissOut:"Нет отметки об уходе", tiMissIn:"Нет отметки о приходе", tiBreak:"Перерыв неправдоподобен",
    previewNote:"Фаза 3 · Предпросмотр – в пилоте пока не активно.",
    signin:"Войти", loginSub:"Войди по табельному номеру или эл. почте.",
    loginId:"Табельный номер", loginIdEmail:"Табельный номер или эл. почта", pnrNotFound:"Табельный номер не найден.", accountDisabled:"Аккаунт отключён – обратитесь в отдел кадров.", email:"Эл. почта", password:"Пароль", pwShow:"Показать пароль", pwHide:"Скрыть пароль",
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
    myReq:"Moje wnioski", reqSummaryUrlaub:"Wybierz okres w kalendarzu. Po wysłaniu wniosek trafia do mistrza zmiany do zatwierdzenia – wiążąco przez Twój login, bez podpisu.",
    reqSummaryKrank:"Zgłoszenie choroby trafia do mistrza zmiany. eAU przychodzi osobno z kasy chorych.",
    legLeave:"Kolega na urlopie", shiftDayWord:"dzień zmianowy", shiftDaysWord:"dni zmianowe", bindingRequest:"Złóż wiążąco",
    overlapNote:(d,k)=>`W ${d} dniach Twojego wyboru ${k===1?"1 kolega jest":`${k} kolegów jest`} już na urlopie – obsada może być napięta.`,
    sprache:"Język", settings:"Ustawienia", appearance:"Wygląd", guideTitle:"Instrukcja", guideSub:"Krótko: co i gdzie zrobić. Dotknij temat, aby rozwinąć.", light:"Jasny", dark:"Ciemny", searchEmp:"Szukaj pracownika",
    cd:(d,h,m)=> d>0 ? `za ${d} dni ${h} godz` : `za ${h} godz ${m} min`,
    unitStd:"godz",
    roleMA:"Pracownik", roleMeister:"Mistrz zmiany", roleVorarbeiter:"Brygadzista", roleGruppenfuehrer:"Lider grupy", crewLabel:"Zmiana",
    crewScopeNote:"Prototyp – w systemie 4 zmian każdy mistrz widzi tylko swój zespół.",
    mTabs:["Wnioski","Zespół","Przydział","Kalendarz","Więcej"], approvalsTitle:"Otwarte wnioski",
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
    manageEmp:"Pracownicy", manageEmpMenu:"Dodaj pracownika", newEmp:"Nowy pracownik", fName:"Imię i nazwisko", roleLbl:"Rola", createBtn:"Utwórz", empCreated:"Pracownik utworzony ✓", noEmp:"Brak pracowników", noTeamCat:"Bez zmiany", adminHint:"Logowanie: e-mail + hasło startowe.",
    changePw:"Zmień hasło", newPw:"Nowe hasło", repeatPw:"Powtórz", pwChanged:"Hasło zmienione ✓", pwMismatch:"Hasła nie są zgodne", pwTooShort:"Minimum 6 znaków", remove:"Usuń",
    forgotLink:"Nie pamiętasz hasła?", forgotTitle:"Reset hasła", forgotSub:"Podaj e-mail – wyślemy link do resetu.", sendResetBtn:"Wyślij link", resetSent:"E-mail wysłany – sprawdź skrzynkę (i spam).", setNewPw:"Ustaw nowe hasło", setNewPwSub:"Wybierz nowe hasło do swojego konta.",
    postfach:"Skrzynka", newMsg:"Nowa wiadomość", noMsg:"Brak wiadomości", toLabel:"Do", plantWide:"Cały zakład", myShift:"Moja zmiana", toPerson:"Osoba", allPlants:"Wszystkie zakłady", wholePlant:"Cały zakład", recipientLbl:"Odbiorca", personalMsg:"Osobiste", pickRecipient:"Wybierz odbiorcę.", subjectLabel:"Temat", msgBody:"Wiadomość", sendMsg:"Wyślij", addFile:"Plik/Zdjęcie", fileTooBig:"Plik za duży (maks. 10 MB)", deleteMsg:"Usuń", reallyDelete:"Na pewno usunąć?", reply:"Odpowiedz", leadershipLabel:"Kierownictwo / Kadry", maSendHint:"Tylko do kierownictwa zmiany lub zakładu.",
    uploadTitle:"Wgraj pasek wypłaty", bulkTitle:"Zbiorcze przesyłanie", bulkHint:"Wiele PDF naraz – numer personalny musi być w nazwie pliku (np. 10007.pdf).", pickPdfs:"Wybierz PDF-y", bulkBtn:"Prześlij wszystko", bulkDone:"przypisano", bulkNoMatch:"brak dopasowania", periodLabel:"Miesiąc", pickPdf:"Wybierz PDF", uploadBtn:"Wgraj", uploadOk:"Wgrano ✓", noPayslips:"Brak pasków wypłat", pdfOnly:"Tylko pliki PDF",
    einteilung:"Twój przydział", notAssigned:"Jeszcze nie przydzielono", assignHint:"Wybierz obszar dla każdego", teamTodayLabel:"Zespół dziś", workAssign:"Przydział stanowisk", workHint1:"Stanowisko:", workHint2:"– dotknij pola.", eraser:"Gumka", copyWeek:"Pierwsza kolumna na tydzień", clearAssign:"Wyczyść",
    absTitle:"Plan urlopów i nieobecności",
    stApproved:"Zatwierdzono", stPending:"Oczekuje", stActive:"Aktywne",
    blTabs:["Przegląd","Nieobecni","Wnioski","Przydział","Więcej"], blTitle:"GLUTOLIN Betrieb · Wszystkie zmiany",
    plantDutyLbl:"Na służbie", plantOpenLbl:"Otwarte wnioski",
    hrTabs:["Płace","Zakłady","Wnioski","Więcej"], roleAssistent:"Asystent zakładu", catFuehrung:"Kierownictwo zmiany", catBelegschaft:"Załoga", noBetriebEmp:"Brak przypisania", newLeitung:"Dodaj kierownictwo", hrTeam:"Zespół HR", hrOverview:"Wnioski i nieobecności", presenceToday:"Dziś", writeMsg:"Napisz wiadomość", sendPayslip:"Wyślij pasek", absenceSlip:"Zaświadczenie o nieobecności (PDF)", reallyRemove:"Na pewno usunąć?", reallyWithdraw:"Na pewno wycofać?", yes:"Tak", no:"Nie", betriebLbl:"Zakład", leitungHint:"Kierownik i asystent mają te same prawa.",
    payrollTitle:"Naliczanie płac", payrollStatus:"W weryfikacji", payrollDone:"zweryfikowano",
    empLbl:"pracowników", timeTitle:"Korekty czasu", hrEmpTitle:"Załoga", exportDatev:"Eksport do DATEV",
    tiMissOut:"Brak wylogowania", tiMissIn:"Brak zalogowania", tiBreak:"Przerwa niewiarygodna",
    previewNote:"Faza 3 · Podgląd – nieaktywne w pilotażu.",
    signin:"Zaloguj się", loginSub:"Zaloguj się numerem personalnym lub e-mailem.",
    loginId:"Numer personalny", loginIdEmail:"Numer personalny lub e-mail", pnrNotFound:"Nie znaleziono numeru personalnego.", accountDisabled:"Konto wyłączone – skontaktuj się z HR.", email:"E-mail", password:"Hasło", pwShow:"Pokaż hasło", pwHide:"Ukryj hasło",
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

// Arbeitstage (Schicht Tag/Nacht, KEINE freien Tage) in einem Zeitraum – für Resturlaub.
function workingDaysBetween(startISO, endISO, rot){
  if(!startISO || !endISO) return 0;
  const s = new Date(startISO+"T00:00:00"), e = new Date(endISO+"T00:00:00");
  let n = 0;
  for(let d = new Date(s); d <= e; d.setDate(d.getDate()+1)){
    if(shiftType(d, rot) !== "F") n++;
  }
  return n;
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
  const [fMonthOff,setFMonthOff] = useState(0);          // Monatsnavigation im Antrags-Kalender
  const [leaveCounts,setLeaveCounts] = useState({});     // {iso: anzahl kollegen im urlaub} – nur Zahlen
  const [toast,setToast] = useState(false);
  const [submitErr,setSubmitErr] = useState("");   // sichtbarer Fehler beim Einreichen
  const [authed,setAuthed] = useState(false);      // Login + DSGVO-Einwilligung bestanden?
  const [consent,setConsent] = useState(false);
  const [loginId,setLoginId] = useState("");
  const [loginPw,setLoginPw] = useState("");
  const [showLoginPw,setShowLoginPw] = useState(false);   // Passwort im Login sichtbar?
  const [theme,setTheme] = useState(()=>{ try{ return localStorage.getItem("theme")||"light"; }catch(e){ return "light"; } });
  const [showSettings,setShowSettings] = useState(false); // Einstellungen-Overlay
  const [showGuide,setShowGuide] = useState(false);       // Anleitung-Overlay (je Rolle)
  const [guideOpen,setGuideOpen] = useState(null);         // aufgeklapptes Anleitungs-Thema
  const [empQuery,setEmpQuery] = useState("");            // Suchfeld für Mitarbeiterlisten
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
  const [aTeam,setATeam] = useState(""); const [aRole,setARole] = useState("mitarbeiter"); const [aBetrieb,setABetrieb] = useState("");
  const [adminScope,setAdminScope] = useState("mit"); // "mit" (BL) | "leitung" | "hrteam"
  const [rmConfirm,setRmConfirm] = useState(null);     // Profil-ID mit Entfernen-Bestätigung
  const [wdConfirm,setWdConfirm] = useState(null);     // Antrags-ID mit Zurückziehen-Bestätigung
  const [adminErr,setAdminErr] = useState(""); const [adminOk,setAdminOk] = useState(false); const [aBusy,setABusy] = useState(false);
  const [showPw,setShowPw] = useState(false); const [pwNew,setPwNew] = useState(""); const [pwNew2,setPwNew2] = useState("");
  const [pwErr,setPwErr] = useState(""); const [pwOk,setPwOk] = useState(false); const [pwBusy,setPwBusy] = useState(false);
  const [recovery,setRecovery] = useState(false);   // Passwort-Reset-Link geöffnet -> neues PW setzen
  const [forgotOpen,setForgotOpen] = useState(false); const [forgotEmail,setForgotEmail] = useState("");
  const [forgotSent,setForgotSent] = useState(false); const [forgotErr,setForgotErr] = useState(""); const [forgotBusy,setForgotBusy] = useState(false);
  const [showPostfach,setShowPostfach] = useState(false); const [messages,setMessages] = useState([]); const [msgOpen,setMsgOpen] = useState(null);
  const [composing,setComposing] = useState(false); const [mSubject,setMSubject] = useState(""); const [mBody,setMBody] = useState(""); const [mScope,setMScope] = useState("all"); const [mRecipient,setMRecipient] = useState("");
  const [leaders,setLeaders] = useState([]);           // Führungskräfte des Mitarbeiters (Empfänger)
  const [leadContacts,setLeadContacts] = useState([]); // Schichtführung -> BL/Assistent/HR (Empfänger)
  const [postErr,setPostErr] = useState(""); const [postBusy,setPostBusy] = useState(false);
  const [mFiles,setMFiles] = useState([]); const [upBusy,setUpBusy] = useState(false); const [attUrls,setAttUrls] = useState({});
  const [delConfirm,setDelConfirm] = useState(null);   // Nachricht-ID mit Lösch-Bestätigung
  const [dbPayslips,setDbPayslips] = useState([]);     // echte Lohnzettel des eingeloggten Nutzers
  const [assignments,setAssignments] = useState({});   // Einteilung des gewählten Tages: profileId -> Bereich
  const [assignDate,setAssignDate] = useState("");     // Datum der Einteilung (Führung; Historie)
  const [teamToday,setTeamToday] = useState([]);       // Kollegen-Sicht heute: [{profile_id, full_name, station}]
  const [selStation,setSelStation] = useState(STATIONS[0]); // aktuell gewählter Arbeitsplatz (Palette) | ABSENT | "__erase"
  const [weekOff,setWeekOff] = useState(0);            // Wochennavigation im Einteilungs-Raster
  const [assignGrid,setAssignGrid] = useState({});     // {`${pid}__${iso}`: station} für den sichtbaren Bereich
  const [eiCrew,setEiCrew] = useState("");             // BL: gewählte Schicht im Einteilungs-Tab
  const [selCrew,setSelCrew] = useState(null);         // BL-Übersicht: aufgeklappte Schicht (team_id)
  const [directory,setDirectory] = useState([]);       // HR Betriebe-Verzeichnis (ganze Firma)
  const [openBetrieb,setOpenBetrieb] = useState(null); // aufgeklappter Betrieb im Betriebe-Tab
  const [dirAction,setDirAction] = useState(null);     // im Betriebe-Verzeichnis angetippte Person (Aktionsmenü)
  const [coTeams,setCoTeams] = useState([]);           // alle Schichten aller Betriebe (HR-Empfängerauswahl)
  const [showHrOverview,setShowHrOverview] = useState(false); // HR-Übersicht (Anträge + Präsenz aller Werke)
  const [coRequests,setCoRequests] = useState([]);     // Anträge aller Werke
  const [coOverview,setCoOverview] = useState([]);     // Präsenz heute aller Werke
  const [psEmp,setPsEmp] = useState(""); const [psPeriod,setPsPeriod] = useState(""); const [psFile,setPsFile] = useState(null);
  const [psBulkFiles,setPsBulkFiles] = useState([]); const [psBulkBusy,setPsBulkBusy] = useState(false); const [psBulkRes,setPsBulkRes] = useState(null);
  const [psList,setPsList] = useState([]); const [psBusy,setPsBusy] = useState(false); const [psErr,setPsErr] = useState(""); const [psOk,setPsOk] = useState(false);
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
    id:r.id, profileId:r.profile_id, teamId:r.profile?.team_id, reqRole:r.profile?.role, name:r.profile?.full_name || "—", type:r.type,
    from:isoToDM(r.start_date), to:isoToDM(r.end_date), startISO:r.start_date, endISO:r.end_date,
    days:(r.start_date&&r.end_date)?Math.max(1,Math.round((Date.parse(r.end_date)-Date.parse(r.start_date))/DAY_MS)+1):1,
    status:r.status, eau:r.type==="krank"?false:undefined,
  });
  async function loadRequests(){
    if(!hasSupabaseConfig) return;
    try{ const rows = await listRequests(); setDbRequests(rows.map(mapReq)); }
    catch(e){ console.warn("[requests]", e.message); }
  }
  const mapMsg = (m)=>({ id:m.id, subject:m.subject, body:m.body, teamId:m.team_id, recipientId:m.recipient_id, senderId:m.sender_id, created_at:m.created_at,
    senderName:m.sender?.full_name || "—", read:(m.reads?.length||0)>0, attachments:m.attachments||[] });
  async function loadMessages(){
    if(!hasSupabaseConfig) return;
    try{ const rows = await listMessages(); setMessages(rows.map(mapMsg)); }
    catch(e){ console.warn("[messages]", e.message); }
  }
  async function loadPayslips(){
    if(!hasSupabaseConfig) return;
    try{ const rows = await listPayslips(); setDbPayslips(rows.map(p=>({ id:p.id, period:p.period, storagePath:p.storage_path }))); }
    catch(e){ console.warn("[payslips]", e.message); }
  }
  const isoOf = (d)=>{ const p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
  async function loadAssignments(date){
    if(!hasSupabaseConfig) return;
    const dt = date || isoOf(new Date());
    setAssignDate(dt);
    try{ const rows = await listAssignments(dt); setAssignments(Object.fromEntries(rows.map(a=>[a.profile_id, a.station]))); }
    catch(e){ console.warn("[assign]", e.message); }
  }
  async function loadTeamToday(){
    if(!hasSupabaseConfig) return;
    try{ setTeamToday(await teamAssignments(isoOf(new Date()))); }
    catch(e){ console.warn("[assign]", e.message); }
  }
  async function setStation(profileId, station){
    setAssignments(a=>({ ...a, [profileId]: station || null }));   // optimistisch
    if(assignDate === isoOf(new Date())) setTeamToday(tt=>tt.map(x=>x.profile_id===profileId?{...x,station:station||null}:x));
    try{ await setAssignment(profileId, assignDate, station); }
    catch(e){ console.warn("[assign]", e.message); }
  }
  // ---- Einteilungs-Raster (Wochen) ----
  function gridColsFor(off, gridRot){
    const r = gridRot || rot;
    const base=new Date(now.getFullYear(),now.getMonth(),now.getDate()+off*7);
    const cols=[];
    for(let i=0;i<12 && cols.length<6;i++){ const d=new Date(base); d.setDate(d.getDate()+i); const st=shiftType(d,r); if(st!=="F") cols.push({date:new Date(d),iso:isoOf(d),st}); }
    return cols;
  }
  async function loadGrid(off){
    if(!hasSupabaseConfig) return;
    const base=new Date(now.getFullYear(),now.getMonth(),now.getDate()+off*7);
    const end=new Date(base); end.setDate(end.getDate()+13);
    try{ const rows=await listAssignmentsRange(isoOf(base), isoOf(end));
      setAssignGrid(Object.fromEntries(rows.map(a=>[a.profile_id+"__"+a.work_date, a.station]))); }
    catch(e){ console.warn("[grid]", e.message); }
  }
  async function paintCell(pid, iso){
    const val = selStation==="__erase" ? null : selStation;
    setAssignGrid(g=>({ ...g, [pid+"__"+iso]: val }));
    if(iso===isoOf(new Date())){ setAssignments(a=>({...a,[pid]:val})); setTeamToday(tt=>tt.map(x=>x.profile_id===pid?{...x,station:val}:x)); }
    if(!hasSupabaseConfig) return;
    try{ await setAssignment(pid, iso, val); }catch(e){ console.warn("[grid]", e.message); }
  }
  async function bulkAssign(list){
    setAssignGrid(g=>{ const n={...g}; list.forEach(([pid,iso,val])=>{ if(val==null) delete n[pid+"__"+iso]; else n[pid+"__"+iso]=val; }); return n; });
    if(!hasSupabaseConfig) return;
    for(const [pid,iso,val] of list){ try{ await setAssignment(pid, iso, val); }catch(e){} }
  }
  const onLeaveDay = (pid, iso)=> hasSupabaseConfig && dbRequests.some(r=> r.profileId===pid && (r.status==="genehmigt"||r.status==="geaendert") && r.startISO<=iso && (r.endISO||r.startISO)>=iso);
  async function openPayslip(storagePath){
    try{ const url = await payslipUrl(storagePath); window.open(url, "_blank", "noopener"); }
    catch(e){ console.warn("[payslip]", e.message); }
  }
  async function loadPsList(empId){
    if(!empId){ setPsList([]); return; }
    try{ const rows = await listPayslips(empId); setPsList(rows); }
    catch(e){ console.warn("[payslips]", e.message); }
  }
  async function doUploadPayslip(){
    if(!psEmp || !psPeriod || !psFile) return;
    setPsBusy(true); setPsErr(""); setPsOk(false);
    try{
      if(psFile.type && psFile.type!=="application/pdf"){ setPsErr(t.pdfOnly); setPsBusy(false); return; }
      await uploadPayslip(psEmp, psPeriod, psFile);
      setPsFile(null); setPsPeriod(""); setPsOk(true);
      await loadPsList(psEmp);
    }catch(err){ setPsErr(err.message); }
    setPsBusy(false);
  }
  // HR arbeitet firmenweit -> Mitarbeiterquelle für Lohnzettel ist das Firmen-Verzeichnis
  // (company_directory), nicht die RLS-begrenzte emps-Liste (die zeigt HR ohne Betrieb nur die Leitung).
  const psEmps = (role==="hr")
    ? directory.filter(d=>d.profile_id).map(d=>({ id:d.profile_id, full_name:d.full_name, personalnummer:d.personalnummer, betrieb_name:d.betrieb_name, role:d.role }))
    : emps;
  // Sammel-Upload: viele PDFs auf einmal, Zuordnung über die Personalnummer im Dateinamen.
  async function doBulkUpload(){
    if(!psPeriod || psBulkFiles.length===0) return;
    setPsBulkBusy(true); setPsBulkRes(null);
    // bekannte Personalnummern -> Profil-ID
    const pnrMap = new Map(psEmps.filter(e=>e.personalnummer).map(e=>[String(e.personalnummer), e]));
    const done = []; const failed = [];
    for(const f of psBulkFiles){
      const groups = (f.name.match(/\d+/g) || []);
      const hit = groups.map(g=>pnrMap.get(g)).find(Boolean);
      if(!hit){ failed.push(f.name); continue; }
      try{ await uploadPayslip(hit.id, psPeriod, f); done.push({ name:f.name, emp:hit.full_name, pnr:hit.personalnummer }); }
      catch(err){ failed.push(`${f.name} (${err.message})`); }
    }
    setPsBulkRes({ done, failed });
    setPsBulkFiles([]);
    if(psEmp) await loadPsList(psEmp);
    setPsBulkBusy(false);
  }
  const unreadCount = messages.filter(m=>!m.read).length;
  const openPostfach = ()=>{ setShowPostfach(true); setComposing(false); setMsgOpen(null); setPostErr(""); setMFiles([]); setDelConfirm(null); loadMessages(); };
  async function openMsg(m){
    const opening = msgOpen!==m.id;
    setMsgOpen(o=>o===m.id?null:m.id);
    if(!m.read){
      try{ await markMessageRead(m.id); setMessages(ms=>ms.map(x=>x.id===m.id?{...x,read:true}:x)); }
      catch(e){ console.warn("[read]", e.message); }
    }
    if(opening && m.attachments?.length){
      const entries = await Promise.all(m.attachments.map(async a=>{
        try{ return [a.path, await messageFileUrl(a.path)]; }catch(e){ return [a.path, null]; }
      }));
      setAttUrls(u=>({ ...u, ...Object.fromEntries(entries) }));
    }
  }
  async function onPickFiles(e){
    const files = Array.from(e.target.files || []); e.target.value = "";
    if(!files.length) return;
    setUpBusy(true); setPostErr("");
    try{
      for(const f of files){
        if(f.size > 10*1024*1024){ setPostErr(t.fileTooBig); continue; }
        const meta = await uploadMessageFile(f);
        setMFiles(fs=>[...fs, meta]);
      }
    }catch(err){ setPostErr(err.message); }
    setUpBusy(false);
  }
  async function doDeleteMessage(id){
    try{
      await deleteMessage(id);
      setMessages(ms=>ms.filter(x=>x.id!==id));
      setDelConfirm(null); setMsgOpen(null);
    }catch(err){ setPostErr(err.message); }
  }
  async function doSendMessage(){
    setPostErr("");
    const isPerson = mScope==="person";
    if(isPerson && !mRecipient){ setPostErr(t.pickRecipient); return; }
    setPostBusy(true);
    let team_id=null, betrieb_id=dbProfile?.betrieb_id, recipient_id=null;
    if(isPerson){ recipient_id = mRecipient; betrieb_id = null; }
    else if(role==="hr"){
      if(mScope==="company"){ betrieb_id = null; }
      else if(mScope.startsWith("b:")){ betrieb_id = mScope.slice(2); }
      else if(mScope.startsWith("t:")){ team_id = mScope.slice(2); betrieb_id = (coTeams.find(x=>x.team_id===team_id)||{}).betrieb_id || null; }
    }
    else if(role==="meister"){ team_id = dbProfile?.team?.id; }
    else { team_id = mScope==="all" ? null : mScope; }   // Betriebsleiter
    try{
      await sendMessage({ subject:mSubject.trim(), body:mBody.trim(), team_id, recipient_id, betrieb_id, attachments:mFiles });
      setMSubject(""); setMBody(""); setMFiles([]); setMRecipient(""); setComposing(false);
      await loadMessages();
    }catch(err){ setPostErr(err.message); }
    setPostBusy(false);
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
  const ROLE_MAP = { mitarbeiter:"ma", schichtmeister:"meister", vorarbeiter:"meister", gruppenfuehrer:"meister", betriebsleiter:"bl", assistent:"bl", personal:"hr" };
  const leadTitle = (dbProfile && {schichtmeister:t.roleMeister, vorarbeiter:t.roleVorarbeiter, gruppenfuehrer:t.roleGruppenfuehrer}[dbProfile.role]) || t.roleMeister;
  async function applyProfile(){
    const p = await getMyProfile();
    if(p.active===false){ const err=new Error("inactive"); err.code="inactive"; throw err; }
    setDbProfile(p);
    setRole(ROLE_MAP[p.role] || "ma");
    const c = p.team?.name ? p.team.name.trim().slice(-1).toUpperCase() : null;
    if (c && "ABCD".includes(c)) setCrew(c);
    setAuthed(true);
    await loadRequests();
    // Team-Mitglieder + Schichten gleich mitladen (RLS: Meister -> eigenes Team, BL -> Betrieb).
    try{ const [e,tm] = await Promise.all([listEmployees(), listTeams()]); setEmps(e); setTeamOpts(tm); }
    catch(e){ console.warn("[team]", e.message); }
    await loadMessages();
    await loadPayslips();
    await loadAssignments();
    await loadTeamToday();
    if (p.role === "personal") {
      try{ setDirectory(await companyDirectory()); }
      catch(e){ console.warn("[directory]", e.message); }
      try{ setCoTeams(await companyTeams()); }
      catch(e){ console.warn("[coteams]", e.message); }
      try{ setCoRequests(await companyRequests()); }catch(e){ console.warn("[coreq]", e.message); }
      try{ setCoOverview(await companyOverview(isoOf(new Date()))); }catch(e){ console.warn("[coovw]", e.message); }
    }
    if (p.role === "mitarbeiter") {
      try{ setLeaders(await myLeadership()); }catch(e){ console.warn("[leaders]", e.message); }
    }
    if (["schichtmeister","vorarbeiter","gruppenfuehrer","betriebsleiter","assistent","personal"].includes(p.role)) {
      try{ setLeadContacts(await leadershipContacts()); }catch(e){ console.warn("[leadContacts]", e.message); }
    }
  }
  async function doLogin(){
    if (!hasSupabaseConfig) { setAuthed(true); return; }   // Demo-Modus ohne Backend
    setBusy(true); setAuthErr("");
    // Eingabe kann E-Mail ODER Personalnummer sein: ohne '@' -> Nummer zur E-Mail auflösen.
    let ident = loginId.trim();
    if (!ident.includes("@")) {
      try {
        const mail = await emailForPnr(ident);
        if (!mail) { setBusy(false); setAuthErr(t.pnrNotFound); return; }
        ident = mail;
      } catch(e) { setBusy(false); setAuthErr(e.message); return; }
    }
    const { error } = await signIn(ident, loginPw);
    if (error) { setBusy(false); setAuthErr(error.message); return; }
    try { await applyProfile(); }
    catch(e){ setAuthErr(e.code==="inactive" ? t.accountDisabled : "Profil nicht gefunden – ist für diesen Login ein Profil angelegt?"); await signOut(); }
    setBusy(false);
  }
  const logout = ()=>{ if(hasSupabaseConfig) signOut(); setAuthed(false); setConsent(false); setLoginPw(""); setDbProfile(null); setTab(0); };

  async function openAdmin(scope="mit"){
    setShowAdmin(true); setAdminScope(scope); setAdminErr(""); setAdminOk(false); setEmpQuery(""); setRmConfirm(null);
    setAName(""); setAEmail(""); setAPw(""); setAPnr("");
    setARole(scope==="hrteam" ? "personal" : scope==="leitung" ? "betriebsleiter" : "mitarbeiter");
    setABetrieb(dbProfile?.betrieb_id || betriebeOpts[0]?.id || "");
    try{
      const [e,tm] = await Promise.all([listEmployees(), listTeams()]);
      setEmps(e); setTeamOpts(tm);
      setATeam(dbProfile?.team?.id || tm[0]?.id || "");
      if(scope!=="mit"){ try{ setDirectory(await companyDirectory()); }catch(e){} }
    }catch(err){ setAdminErr(err.message); }
  }
  async function doCreateEmployee(){
    setABusy(true); setAdminErr(""); setAdminOk(false);
    const isHRmode = adminScope==="leitung" || adminScope==="hrteam";
    try{
      await createEmployee({
        email:aEmail.trim(), password:aPw, full_name:aName.trim(), personalnummer:aPnr.trim(),
        team_id: isHRmode ? null : (role==="bl" ? aTeam : dbProfile?.team?.id),
        role: adminScope==="hrteam" ? "personal" : (adminScope==="leitung" ? aRole : (role==="bl" ? aRole : "mitarbeiter")),
        betrieb_id: isHRmode ? aBetrieb : dbProfile?.betrieb_id,
      });
      setAName(""); setAEmail(""); setAPw(""); setAPnr(""); setAdminOk(true);
      if(isHRmode){ try{ setDirectory(await companyDirectory()); }catch(e){} }
      else setEmps(await listEmployees());
    }catch(err){ setAdminErr(err.message); }
    setABusy(false);
  }
  // HR-Übersicht (Anträge + Präsenz aller Werke) öffnen und laden.
  async function openHrOverview(){
    setShowHrOverview(true);
    try{ setCoRequests(await companyRequests()); }catch(e){ console.warn("[coreq]", e.message); }
    try{ setCoOverview(await companyOverview(isoOf(new Date()))); }catch(e){ console.warn("[coovw]", e.message); }
  }
  // HR entfernt HR/Leitung: Konto deaktivieren (reversibel) – mit Sicherheitsabfrage.
  async function doDeactivate(id){
    setAdminErr("");
    try{ await updateEmployee(id,{active:false}); setRmConfirm(null); try{ setDirectory(await companyDirectory()); }catch(e){} }
    catch(err){ setAdminErr(err.message); }
  }
  async function changeEmpRole(id, newRole){
    try{ await updateEmployee(id,{role:newRole}); setEmps(es=>es.map(e=>e.id===id?{...e,role:newRole}:e)); }
    catch(err){ setAdminErr(err.message); }
  }
  async function changeEmpTeam(id, teamId){
    try{ await updateEmployee(id,{team_id: teamId || null}); setEmps(await listEmployees()); }
    catch(err){ setAdminErr(err.message); }
  }
  async function doRemoveEmp(id){
    setAdminErr("");
    try{ await removeFromTeam(id); setEmps(await listEmployees()); }
    catch(err){ setAdminErr(err.message); }
  }
  // Abwesenheitsnachweis-PDF für einen Mitarbeiter (Meister: eigene Schicht, BL: eigener Betrieb – RLS begrenzt).
  async function downloadEmpAbsencePdf(e){
    let reqs = [];
    if(hasSupabaseConfig){ try{ reqs = (await listRequests()).filter(r=>r.profile_id===e.id); }catch(err){ setAdminErr(err.message); } }
    downloadAbsencePdf({
      full_name:e.full_name, personalnummer:e.personalnummer,
      betrieb_name: dbProfile?.betrieb?.name || "",
      team_name: teamOpts.find(tm=>tm.id===e.team_id)?.name || e.team?.name || "",
    }, reqs);
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
  async function doForgot(){
    setForgotErr(""); setForgotSent(false); setForgotBusy(true);
    try{ await sendPasswordReset(forgotEmail.trim()); setForgotSent(true); }
    catch(err){ setForgotErr(err.message); }
    setForgotBusy(false);
  }
  async function doRecoverySet(){
    setPwErr("");
    if(pwNew.length < 6){ setPwErr(t.pwTooShort); return; }
    if(pwNew !== pwNew2){ setPwErr(t.pwMismatch); return; }
    setPwBusy(true);
    try{
      await changePassword(pwNew);
      try{ window.history.replaceState(null,"",window.location.pathname); }catch(e){}
      setRecovery(false); setPwNew(""); setPwNew2("");
      await applyProfile();   // direkt anmelden
    }catch(err){ setPwErr(err.message); }
    setPwBusy(false);
  }

  // Bestehende Anmeldung beim Start laden (nur mit Supabase-Config).
  useEffect(()=>{
    if(!hasSupabaseConfig) return;
    (async()=>{
      // Kam der Nutzer über einen Passwort-Reset-Link? -> neues Passwort setzen.
      if(typeof window!=="undefined" && window.location.hash.includes("type=recovery")){
        setRecovery(true); setDbReady(true); return;
      }
      try{ const s = await getSession(); if(s) await applyProfile(); }
      catch(e){ /* nicht eingeloggt */ }
      setDbReady(true);
    })();
  }, []);

  // Theme (hell/dunkel) merken + auf Dokument anwenden.
  useEffect(()=>{
    try{ localStorage.setItem("theme", theme); }catch(e){}
    try{ document.documentElement.style.colorScheme = theme==="dark" ? "dark" : "light"; }catch(e){}
  }, [theme]);

  // Einteilungs-Raster laden (Schichtführung + Betriebsleitung), bei Wochenwechsel neu.
  useEffect(()=>{ if((role==="meister"||role==="bl") && hasSupabaseConfig) loadGrid(weekOff); }, [role, weekOff, dbProfile]);

  // Demo-Deeplink für Screenshots/Vorschau (nur ohne Backend):
  //   #demo=<rolle>[:<tab>]   z.B. #demo=bl:0  -> direkt angemeldet in dieser Ansicht.
  useEffect(()=>{
    if(hasSupabaseConfig) return;
    const h = window.location.hash||"";
    const m = /#demo=([a-z]+)(?::(\d+))?/.exec(h);
    if(!m) return;
    setRole(m[1]); if(m[2]!==undefined) setTab(Number(m[2]));
    setConsent(true); setAuthed(true);
    const th = /theme=(dark|light)/.exec(h); if(th) setTheme(th[1]);
    const open = /open=(\w+)/.exec(h);
    if(open){ const o=open[1];
      if(o==="admin") setShowAdmin(true);
      else if(o==="postfach") setShowPostfach(true);
      else if(o==="compose"){ setShowPostfach(true); setComposing(true); }
      else if(o==="payslips") setShowPayslips(true);
    }
    // Demo-Beispieldaten für die HR-Ansichten (Betriebe/Anträge), damit die Vorschau gefüllt ist.
    if(m[1]==="hr"){
      setOpenBetrieb("Glutolin");
      const D=(bn,fn,role,tn,pnr)=>({betrieb_id:bn,betrieb_name:bn,profile_id:fn+pnr,full_name:fn,role,team_name:tn,personalnummer:pnr});
      setDirectory([
        D("Glutolin","Ingo Fricke","betriebsleiter",null,"10017"),
        D("Glutolin","Loos","schichtmeister","Schicht D","10014"),
        D("Glutolin","Bärenstrauch","vorarbeiter","Schicht D","10015"),
        D("Glutolin","Süer","gruppenfuehrer","Schicht D","10016"),
        D("Glutolin","Arar","mitarbeiter","Schicht D","10001"),
        D("Glutolin","Baumann","mitarbeiter","Schicht D","10002"),
        D("Glutolin","Bingert","mitarbeiter","Schicht D","10003"),
        D("HEC","Paul Neumann","betriebsleiter",null,"20010"),
        D("HEC","Weber","mitarbeiter","Schicht A","20011"),
        D("HEC","Fischer","mitarbeiter","Schicht A","20012"),
        D("Tyloshin 1","Koch","mitarbeiter","Schicht B","30001"),
        {betrieb_id:"Tyloshin 2",betrieb_name:"Tyloshin 2",profile_id:null,full_name:null,role:null,team_name:null,personalnummer:null},
      ]);
      setCoTeams([
        {team_id:"g-a",team_name:"Schicht A",betrieb_id:"b1",betrieb_name:"Glutolin"},
        {team_id:"g-d",team_name:"Schicht D",betrieb_id:"b1",betrieb_name:"Glutolin"},
        {team_id:"h-a",team_name:"Schicht A",betrieb_id:"b2",betrieb_name:"HEC"},
        {team_id:"t-b",team_name:"Schicht B",betrieb_id:"b3",betrieb_name:"Tyloshin 1"},
      ]);
      setCoRequests([
        {id:"r1",profile_id:"x1",full_name:"Arar",betrieb_name:"Glutolin",team_name:"Schicht D",type:"urlaub",start_date:"2026-07-20",end_date:"2026-07-31",status:"offen"},
        {id:"r2",profile_id:"x2",full_name:"Weber",betrieb_name:"HEC",team_name:"Schicht A",type:"krank",start_date:"2026-07-15",end_date:"2026-07-17",status:"genehmigt"},
        {id:"r3",profile_id:"x3",full_name:"Koch",betrieb_name:"Tyloshin 1",team_name:"Schicht B",type:"urlaub",start_date:"2026-08-03",end_date:"2026-08-14",status:"offen"},
      ]);
      setCoOverview([
        {profile_id:"o1",full_name:"Baumann",betrieb_name:"Glutolin",team_name:"Schicht D",role:"mitarbeiter",status:"duty"},
        {profile_id:"o2",full_name:"Bingert",betrieb_name:"Glutolin",team_name:"Schicht D",role:"mitarbeiter",status:"duty"},
        {profile_id:"o3",full_name:"Weber",betrieb_name:"HEC",team_name:"Schicht A",role:"mitarbeiter",status:"sick"},
        {profile_id:"o4",full_name:"Koch",betrieb_name:"Tyloshin 1",team_name:"Schicht B",role:"mitarbeiter",status:"vac"},
        {profile_id:"o5",full_name:"Fischer",betrieb_name:"HEC",team_name:"Schicht A",role:"mitarbeiter",status:"duty"},
      ]);
    }
  }, []);

  // Der eingeloggte Mitarbeiter (Demo): Daniel Schäfer, Schichtgruppe C.
  const EMP_NAME = "Daniel Schäfer", EMP_CREW = "C";
  const fmtDay = (iso)=>{ if(!iso) return "—"; const [,m,d] = iso.split("-"); return `${d}.${m}.`; };
  // Anzahl Kollegen im Urlaub je Tag laden (nur Zahlen – Datenschutz).
  async function loadLeaveCounts(monthOff){
    const base = new Date(now.getFullYear(), now.getMonth()+monthOff, 1);
    const last = new Date(base.getFullYear(), base.getMonth()+1, 0);
    const map = {};
    if(hasSupabaseConfig){
      try{ (await teamLeaveCounts(isoOf(base), isoOf(last))).forEach(r=>{ map[r.work_date]=r.cnt; }); }
      catch(e){ console.warn("[leave]", e.message); }
    } else {
      const list = (ABSENCES[crew]||[]).filter(a=>a.type==="urlaub" && a.status==="approved");
      for(let d=1; d<=last.getDate(); d++){ const date=new Date(base.getFullYear(),base.getMonth(),d);
        const cnt=list.filter(a=>absCoversDay(a,date)).length; if(cnt>0) map[isoOf(date)]=cnt; }
    }
    setLeaveCounts(map);
  }
  const navFMonth = (delta)=>{ const n=fMonthOff+delta; setFMonthOff(n); loadLeaveCounts(n); };
  function selectDay(iso){
    if(!fFrom || (fFrom && fTo)){ setFFrom(iso); setFTo(""); }
    else if(iso < fFrom){ setFFrom(iso); setFTo(""); }
    else setFTo(iso);
  }
  const openForm = (type)=>{ setForm(type); setEditId(null); setFFrom(""); setFTo(""); setSubmitErr(""); setFMonthOff(0); loadLeaveCounts(0); };
  const openEdit = (r)=>{ setForm(r.type); setEditId(r.id); setSubmitErr(""); setFFrom(r.startISO || ""); setFTo(r.endISO || "");
    let mo=0; if(r.startISO){ const [y,m]=r.startISO.split("-").map(Number); mo=(y-now.getFullYear())*12+(m-1-now.getMonth()); }
    setFMonthOff(mo); loadLeaveCounts(mo); };
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

  // Resturlaub: 28 Standard minus genommene ARBEITSTAGE aus eigenen genehmigten Urlauben.
  const usedUrlaub = hasSupabaseConfig
    ? dbRequests
        .filter(r=> r.profileId===dbProfile?.id && r.type==="urlaub" && (r.status==="genehmigt"||r.status==="geaendert"))
        .reduce((s,r)=> s + workingDaysBetween(r.startISO, r.endISO, rot), 0)
    : 0;
  const resturlaub = Math.max(0, URLAUB_TAGE - usedUrlaub);

  // Schichteinteilung heute: eigener Bereich + Kollegen (aus der sicheren Team-Abfrage).
  const myStation = (teamToday.find(x=>x.profile_id===dbProfile?.id) || {}).station;
  const colleaguesToday = teamToday.filter(x=>x.profile_id!==dbProfile?.id);

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
  // Meister genehmigt Mitarbeiter + Vorarbeiter/Gruppenführer – NICHT Schichtmeister-Anträge (auch nicht den eigenen).
  const meisterReqs = reqs.filter(r=> r.reqRole!=="schichtmeister" && r.profileId!==dbProfile?.id);
  const meisterPending = meisterReqs.filter(r=>!decOf(r));
  // Team heute: echte Mitglieder aus der DB; Status aus genehmigter Abwesenheit
  // (Urlaub/Krank) bzw. der Team-Rotation (Schicht heute = Dienst, sonst frei).
  const team = hasSupabaseConfig
    ? emps.filter(e=>e.team_id && e.team_id===dbProfile?.team?.id).map(e=>{
        const abs = dbRequests.find(r=>r.profileId===e.id && (r.status==="genehmigt"||r.status==="geaendert") && absCoversDay(r, now));
        const st = abs ? (abs.type==="krank"?"sick":"vac") : (shiftType(now, rot)!=="F" ? "duty" : "off");
        return { id:e.id, name:e.full_name, role:e.role, st };
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

  // Personal (HR): echte werksweite Belegschaft mit Status heute (krank/Urlaub/im Dienst/frei).
  const allEmpsReal = emps.map(e=>{
    const tm = teamOpts.find(x=>x.id===e.team_id);
    const abs = dbRequests.find(r=>r.profileId===e.id && (r.status==="genehmigt"||r.status==="geaendert") && absCoversDay(r, now));
    const st = abs ? (abs.type==="krank"?"sick":"vac")
      : (tm ? (shiftType(now,{offset:tm.rotation_offset||0, anchorMs:anchorToMs(tm.anchor_date)})!=="F" ? "duty" : "off") : "off");
    return { id:e.id, name:e.full_name, pnr:e.personalnummer, crew: tm ? tm.name.trim().slice(-1).toUpperCase() : "—", st };
  }).sort((a,b)=>(a.name||"").localeCompare(b.name||""));

  const crewStats = hasSupabaseConfig
    ? teamOpts.map(tm=>{
        const members = emps.filter(e=>e.team_id===tm.id);
        const worksToday = shiftType(now, {offset:tm.rotation_offset||0, anchorMs:anchorToMs(tm.anchor_date)}) !== "F";
        const absent = members.filter(m=>absentTodayIds.has(m.id)).length;
        return { c: tm.name.trim().slice(-1).toUpperCase(), id: tm.id, members, worksToday, total: members.length,
          duty: worksToday ? members.length-absent : 0, absent,
          open: dbRequests.filter(r=>r.teamId===tm.id && !decOf(r)).length };
      })
    : crewsAll.map(c=>({ c, id:c, members:(TEAM[c]||[]).map(m=>({id:m.name,full_name:m.name,role:"mitarbeiter"})), worksToday:true,
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
        <div className="foot" style={{marginTop:24}}>PROTOTYP · U. Kebeli</div>
      </div>
    </div>
  );

  // Lohnzettel-Overlay – für jeden, der eigenen Lohn sehen darf (auch Meister).
  // Echte Lohnzettel des eingeloggten Nutzers (Demo: die Platzhalter-Monate).
  const psRows = hasSupabaseConfig
    ? (dbPayslips.length===0
        ? <div style={{color:"var(--faint)",fontSize:14,padding:"6px 0"}}>{t.noPayslips}</div>
        : dbPayslips.map(p=>{ const [y,mo]=String(p.period).split("-"); return (
            <div className="row" key={p.id} onClick={()=>openPayslip(p.storagePath)}>
              <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.months[+mo-1]} {y}</span>
              <span className="row-r">{t.openPdf}<ChevronRight size={15}/></span>
            </div>); }))
    : payslips.map((p,i)=>(
        <div className="row" key={i} onClick={()=>{}}>
          <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.months[p.m]} {p.y}</span>
          <span className="row-r">{t.openPdf}<ChevronRight size={15}/></span>
        </div>));

  const payslipSheet = showPayslips && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setShowPayslips(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{t.payslipList}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="eyebrow" style={{marginBottom:12}}>{t.payslipList}</div>
          {psRows}
          <div className="note"><FileText size={13} style={{flexShrink:0,marginTop:1}}/><span>{t.payslipNote}</span></div>
        </div>
        <div className="card">
          <div className="eyebrow" style={{marginBottom:12}}>{t.urlaubKonto}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}>
            <span className="num" style={{fontSize:28,fontWeight:700,color:"var(--plus)"}}>{resturlaub}</span>
            <span style={{color:"var(--muted)",fontSize:14}}>{t.daysWord}</span>
          </div>
        </div>
        <div className="foot" style={{marginTop:24}}>PROTOTYP · U. Kebeli</div>
      </div>
    </div>
  );

  // Mitarbeiterverwaltung (Overlay). Betriebsleiter darf Rollen zuweisen, Meister nur Mitarbeiter anlegen.
  const ROLE_OPTS = [["mitarbeiter",t.roleMA],["assistent",t.roleAssistent],["schichtmeister",t.roleMeister],["vorarbeiter",t.roleVorarbeiter],["gruppenfuehrer",t.roleGruppenfuehrer],["betriebsleiter",t.roleBL],["personal",t.roleHR]];
  // HR legt nur Leitung an: Betriebsleiter + Assistent (gleiche Rechte).
  const ROLE_OPTS_LEIT = [["betriebsleiter",t.roleBL],["assistent",t.roleAssistent]];
  // Mitarbeiter-Suche (Name oder Personalnummer).
  const empMatch = (e,q)=>{ const s=(q||"").trim().toLowerCase(); if(!s) return true;
    return (e.full_name||"").toLowerCase().includes(s) || String(e.personalnummer||"").toLowerCase().includes(s); };
  // Betriebsleiter/Assistent dürfen NUR Mitarbeiter + Schichtführung anlegen/ändern (keine Personalabteilung, keine Leitung).
  const BL_MANAGED = ["mitarbeiter","schichtmeister","vorarbeiter","gruppenfuehrer"];
  const ROLE_OPTS_BL = ROLE_OPTS.filter(([v])=>BL_MANAGED.includes(v));
  // Betriebe-Liste (für HR) aus dem Firmen-Verzeichnis ableiten.
  const betriebeOpts = [...new Map(directory.map(r=>[r.betrieb_id, r.betrieb_name])).entries()].map(([id,name])=>({id,name}));
  const adminIsBL = role==="bl";
  const adminIsHR = role==="hr";
  const scopeLeitung = adminScope==="leitung";  // HR legt Betriebsleitung/Assistent an
  const scopeHRteam  = adminScope==="hrteam";   // HR legt HR-Kollegen (Personalabteilung) an
  // HR-Liste (Leitung bzw. Personalabteilung) aus dem Firmen-Verzeichnis.
  const hrList = directory.filter(r=>r.profile_id && (scopeHRteam ? r.role==="personal" : ["betriebsleiter","assistent"].includes(r.role)));
  const selStyle = {width:"100%",padding:"12px",backgroundPosition:"right 12px center"};
  // Monat robust wählen (Jahr + Monat als Auswahllisten) -> immer "YYYY-MM",
  // unabhängig davon, ob der Browser <input type="month"> unterstützt.
  const monthPicker = (after)=>{
    const curY = new Date().getFullYear();
    const valid = /^\d{4}-\d{2}$/.test(psPeriod);
    const py = valid ? psPeriod.slice(0,4) : String(curY);
    const pm = valid ? psPeriod.slice(5,7) : "";
    const build = (y,m)=>{ setPsPeriod(m ? `${y}-${m}` : ""); if(after) after(); };
    return (
      <div style={{display:"flex",gap:8}}>
        <select className="lang-select" style={{...selStyle,flex:"0 0 96px"}} value={py} onChange={e=>build(e.target.value, pm)}>
          {[curY-1,curY,curY+1].map(y=><option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select className="lang-select" style={selStyle} value={pm} onChange={e=>build(py, e.target.value)}>
          <option value="">—</option>
          {t.months.map((nm,i)=>{ const m=String(i+1).padStart(2,"0"); return <option key={m} value={m}>{nm}</option>; })}
        </select>
      </div>
    );
  };
  // Belegschaft nach Schichten gruppieren (nur Mitarbeiter + Schichtführung; Leitung/HR erscheinen hier nicht).
  const empGroups = (()=>{
    const mEmps = emps.filter(e=>BL_MANAGED.includes(e.role));
    const gs = teamOpts.map(tm=>({ key:tm.id, title:tm.name, members: mEmps.filter(e=>e.team_id===tm.id) }));
    const noTeam = mEmps.filter(e=>!e.team_id);
    if(noTeam.length) gs.push({ key:"__none", title:t.noTeamCat, members:noTeam });
    return gs;
  })();
  // HR: Aktionsmenü, wenn im Betriebe-Verzeichnis ein Name angetippt wird.
  const dirActionSheet = dirAction && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setDirAction(null)}><ChevronLeft size={18}/></button>
        <span className="disp">{dirAction.full_name}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="row" onClick={()=>{ const p=dirAction; setDirAction(null); setShowPostfach(true); setComposing(true); setPostErr(""); setMSubject(""); setMBody(""); setMScope("person"); setMRecipient(p.profile_id); setMFiles([]); setEmpQuery(""); }}>
            <span className="row-l"><span className="row-ic"><PenSquare size={16}/></span>{t.writeMsg}</span>
            <ChevronRight size={16} color="var(--faint)"/>
          </div>
          <div className="row" onClick={()=>{ const p=dirAction; setDirAction(null); setTab(0); setPsEmp(p.profile_id); setPsOk(false); setPsErr(""); setEmpQuery(""); loadPsList(p.profile_id); }}>
            <span className="row-l"><span className="row-ic"><Wallet size={16}/></span>{t.sendPayslip}</span>
            <ChevronRight size={16} color="var(--faint)"/>
          </div>
          <div className="row" onClick={async ()=>{ const p=dirAction; setDirAction(null);
            let reqs=[];
            if(hasSupabaseConfig){ try{ reqs=(await companyRequests()).filter(r=>r.profile_id===p.profile_id); }catch(e){ console.warn("[abs-pdf]", e.message); } }
            else { reqs=coRequests; }
            downloadAbsencePdf(p, reqs); }}>
            <span className="row-l"><span className="row-ic"><Download size={16}/></span>{t.absenceSlip}</span>
            <ChevronRight size={16} color="var(--faint)"/>
          </div>
        </div>
        <div style={{fontSize:11,color:"var(--faint)",marginTop:10,lineHeight:1.5}}>{dirAction.betrieb_name}</div>
      </div>
    </div>
  );
  // HR-Übersicht: Anträge + Präsenz heute über alle Werke.
  const hrOverviewContent = (()=>{
    const duty = coOverview.filter(x=>x.status==="duty").length;
    const absent = coOverview.filter(x=>x.status==="sick"||x.status==="vac");
    const reqBadge = (s)=> s==="offen" ? {c:"s",label:t.stPending} : s==="abgelehnt" ? {c:"h",label:t.rejected} : {c:"g",label:t.approved};
    const groupB = (arr)=>{ const g=[]; arr.forEach(x=>{ const b=x.betrieb_name||"—"; let e=g.find(y=>y.b===b); if(!e){ e={b,items:[]}; g.push(e); } e.items.push(x); }); return g; };
    const absentG = groupB(absent), reqG = groupB(coRequests);
    return (
      <>
        <div className="eyebrow" style={{marginBottom:8}}>{t.presenceToday}</div>
        <div className="stats" style={{marginTop:0}}>
          <div className="stat"><div className="k">{t.statusDuty}</div><div className="v plus num">{duty}</div></div>
          <div className="stat"><div className="k">{t.absentLbl}</div><div className="v amber num">{absent.length}</div></div>
        </div>
        <div className="eyebrow" style={{margin:"6px 2px 8px"}}>{t.absentLbl} · {absent.length}</div>
        {absent.length===0 && <div className="card" style={{marginTop:0}}><div style={{color:"var(--faint)",fontSize:14}}>{t.noneAbsent}</div></div>}
        {absentG.map(g=>(
          <div className="card" key={g.b} style={{marginTop:0,marginBottom:10}}>
            <div className="cat-h">{g.b} · {g.items.length}</div>
            {g.items.map(x=>(
              <div className="row" key={x.profile_id} style={{cursor:"default"}}>
                <div className="row-l"><span className="row-ic">{initials(x.full_name)}</span>
                  <div><div style={{fontWeight:600}}>{x.full_name}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{x.team_name||"—"}</div></div>
                </div>
                <span className={"tg "+(x.status==="sick"?"h":"s")}>{x.status==="sick"?t.statusSick:t.statusVac}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="eyebrow" style={{margin:"10px 2px 8px"}}>{t.approvalsTitle} · {coRequests.length}</div>
        {coRequests.length===0 && <div className="card" style={{marginTop:0}}><div style={{color:"var(--faint)",fontSize:14}}>{t.allClear}</div></div>}
        {reqG.map(g=>(
          <div className="card" key={g.b} style={{marginTop:0,marginBottom:10}}>
            <div className="cat-h">{g.b} · {g.items.length}</div>
            {g.items.map(r=>{ const st=reqBadge(r.status); return (
              <div className="row" key={r.id} style={{cursor:"default"}}>
                <div className="row-l"><span className="row-ic">{r.type==="krank"?<HeartPulse size={15}/>:<Plane size={15}/>}</span>
                  <div><div style={{fontWeight:600}}>{r.full_name}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{r.team_name?`${r.team_name} · `:""}{r.start_date}{r.end_date&&r.end_date!==r.start_date?` – ${r.end_date}`:""}</div></div>
                </div>
                <span className={"tg "+st.c}>{st.label}</span>
              </div>
            ); })}
          </div>
        ))}
        <div className="foot">PROTOTYP · U. Kebeli</div>
      </>
    );
  })();
  const adminSheet = showAdmin && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setShowAdmin(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{scopeHRteam ? t.hrTeam : scopeLeitung ? t.newLeitung : t.manageEmp}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="eyebrow" style={{marginBottom:12}}>{scopeHRteam ? t.hrTeam : scopeLeitung ? t.newLeitung : t.newEmp}</div>
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
                  {ROLE_OPTS_BL.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </>
          )}
          {adminIsHR && (
            <>
              <div className="field"><label>{t.betriebLbl}</label>
                <select className="lang-select" style={selStyle} value={aBetrieb} onChange={e=>setABetrieb(e.target.value)}>
                  {betriebeOpts.length===0 && <option value={dbProfile?.betrieb_id||""}>—</option>}
                  {betriebeOpts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              {scopeLeitung && (
                <>
                  <div className="field"><label>{t.roleLbl}</label>
                    <select className="lang-select" style={selStyle} value={aRole} onChange={e=>setARole(e.target.value)}>
                      {ROLE_OPTS_LEIT.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{fontSize:11,color:"var(--faint)",marginBottom:12,lineHeight:1.5}}>{t.leitungHint}</div>
                </>
              )}
              {scopeHRteam && (
                <div className="field"><label>{t.roleLbl}</label>
                  <span className="tg mut" style={{alignSelf:"flex-start"}}>{t.roleHR}</span>
                </div>
              )}
            </>
          )}
          <button className="submit" disabled={aBusy || !aName || !aEmail || !aPw || (adminIsHR && !aBetrieb)} onClick={doCreateEmployee}>{aBusy?"…":t.createBtn}</button>
          {adminOk && <div className="login-note" style={{color:"var(--plus)",marginTop:10}}>{t.empCreated}</div>}
          {adminErr && <div className="login-note" style={{color:"var(--red)",marginTop:10}}>{adminErr}</div>}
          <div className="login-note" style={{marginTop:12}}>{t.adminHint}</div>
        </div>

        {!adminIsHR && <div className="eyebrow" style={{margin:"4px 2px 0"}}>{t.manageEmp} · {empGroups.reduce((n,g)=>n+g.members.length,0)}</div>}
        {!adminIsHR && emps.length>0 && (
          <div className="field" style={{marginBottom:12}}><input value={empQuery} onChange={e=>setEmpQuery(e.target.value)} placeholder={t.searchEmp} /></div>
        )}
        {!adminIsHR && emps.length===0 && <div className="card"><div style={{color:"var(--faint)",fontSize:14}}>{t.noEmp}</div></div>}
        {!adminIsHR && empGroups.map(g=>({ ...g, members:g.members.filter(e=>empMatch(e,empQuery)) })).filter(g=>g.members.length>0).map(g=>(
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
                {adminIsBL && BL_MANAGED.includes(e.role)
                  ? <>
                      <select className="lang-select" value={e.role} onChange={ev=>changeEmpRole(e.id,ev.target.value)}>
                        {ROLE_OPTS_BL.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                      </select>
                      <select className="lang-select" value={e.team_id||""} onChange={ev=>changeEmpTeam(e.id,ev.target.value)}>
                        <option value="">{t.noTeamCat}</option>
                        {teamOpts.map(tm=><option key={tm.id} value={tm.id}>{tm.name}</option>)}
                      </select>
                    </>
                  : <span className="tg mut">{(ROLE_OPTS.find(([v])=>v===e.role)||[])[1] || e.role}</span>}
                <button className="mini-btn" title={t.absenceSlip} onClick={()=>downloadEmpAbsencePdf(e)} style={{display:"inline-flex",alignItems:"center",gap:5}}><Download size={13}/>PDF</button>
                {e.id!==dbProfile?.id && ((adminIsBL && BL_MANAGED.includes(e.role)) || (!adminIsBL && e.role==="mitarbeiter")) && (
                  rmConfirm===e.id
                    ? <span style={{display:"inline-flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:12,color:"var(--red)"}}>{t.reallyRemove}</span>
                        <button className="mini-btn danger" onClick={()=>{ doRemoveEmp(e.id); setRmConfirm(null); }}>{t.yes}</button>
                        <button className="mini-btn" onClick={()=>setRmConfirm(null)}>{t.no}</button>
                      </span>
                    : <button className="mini-btn danger" onClick={()=>setRmConfirm(e.id)}>{t.remove}</button>
                )}
              </div>
            ))}
          </div>
        ))}

        {adminIsHR && (
          <>
            <div className="eyebrow" style={{margin:"4px 2px 0"}}>{(scopeHRteam ? t.hrTeam : t.newLeitung)} · {hrList.length}</div>
            {hrList.length>0 && (
              <div className="field" style={{marginBottom:12}}><input value={empQuery} onChange={e=>setEmpQuery(e.target.value)} placeholder={t.searchEmp} /></div>
            )}
            <div className="card" style={{marginTop:0}}>
              {hrList.length===0 && <div style={{color:"var(--faint)",fontSize:14}}>{t.noEmp}</div>}
              {hrList.filter(p=>empMatch({full_name:p.full_name,personalnummer:p.personalnummer},empQuery)).map(p=>(
                <div key={p.profile_id} style={{padding:"11px 0",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <div className="row-l" style={{flex:"1 1 120px"}}>
                    <span className="row-ic">{initials(p.full_name||"—")}</span>
                    <div>
                      <div style={{fontWeight:600}}>{p.full_name}</div>
                      <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{p.betrieb_name}{p.personalnummer?` · ${p.personalnummer}`:""}</div>
                    </div>
                  </div>
                  {p.profile_id!==dbProfile?.id && (
                    rmConfirm===p.profile_id
                      ? <span style={{display:"inline-flex",gap:6,alignItems:"center"}}>
                          <span style={{fontSize:12,color:"var(--red)"}}>{t.reallyRemove}</span>
                          <button className="mini-btn danger" onClick={()=>doDeactivate(p.profile_id)}>{t.yes}</button>
                          <button className="mini-btn" onClick={()=>setRmConfirm(null)}>{t.no}</button>
                        </span>
                      : <button className="mini-btn danger" onClick={()=>setRmConfirm(p.profile_id)}>{t.remove}</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="foot" style={{marginTop:24}}>PROTOTYP · U. Kebeli</div>
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

  const forgotSheet = forgotOpen && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setForgotOpen(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{t.forgotTitle}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <p style={{fontSize:13,color:"var(--muted)",marginBottom:14,lineHeight:1.5}}>{t.forgotSub}</p>
          <div className="field"><label>{t.email}</label><input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="name@firma.de" autoComplete="username" /></div>
          <button className="submit" disabled={forgotBusy || !forgotEmail} onClick={doForgot}>{forgotBusy?"…":t.sendResetBtn}</button>
          {forgotSent && <div className="login-note" style={{color:"var(--plus)",marginTop:10}}>{t.resetSent}</div>}
          {forgotErr && <div className="login-note" style={{color:"var(--red)",marginTop:10}}>{forgotErr}</div>}
        </div>
      </div>
    </div>
  );

  const teamNameOf = (id)=> teamOpts.find(x=>x.id===id)?.name || "—";
  const canSend = role==="meister" || role==="bl" || role==="hr" || role==="ma";
  const leaderRole = (r)=> ({schichtmeister:t.roleMeister,vorarbeiter:t.roleVorarbeiter,gruppenfuehrer:t.roleGruppenfuehrer,betriebsleiter:t.roleBL,assistent:t.roleAssistent,personal:t.roleHR}[r] || r);
  const fmtMsgDate = (iso)=>{ const d=new Date(iso); const p=n=>String(n).padStart(2,"0"); return `${p(d.getDate())}.${p(d.getMonth()+1)}. ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const postfachSheet = showPostfach && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=> composing ? setComposing(false) : setShowPostfach(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{composing ? t.newMsg : t.postfach}</span>
        {!composing && canSend && <button className="navbtn" style={{marginLeft:"auto"}} onClick={()=>{setComposing(true); setPostErr(""); setMSubject(""); setMBody(""); setMScope(role==="meister"?"shift":role==="hr"?"company":role==="ma"?"person":"all"); setMRecipient(""); setMFiles([]); setEmpQuery("");}} aria-label={t.newMsg}><PenSquare size={18}/></button>}
      </div>
      <div className="sheet-body">
        {composing ? (
          <div className="card" style={{marginTop:0}}>
            {role==="ma" ? (
              <div className="field"><label>{t.toLabel}</label>
                <select className="lang-select" style={selStyle} value={mRecipient} onChange={e=>setMRecipient(e.target.value)}>
                  <option value="">—</option>
                  {leaders.map(l=><option key={l.profile_id} value={l.profile_id}>{l.full_name} · {leaderRole(l.role)}</option>)}
                </select>
                <div style={{fontSize:11,color:"var(--faint)",marginTop:6,lineHeight:1.5}}>{t.maSendHint}</div>
              </div>
            ) : (
              <>
                <div className="field"><label>{t.toLabel}</label>
                  <select className="lang-select" style={selStyle} value={mScope} onChange={e=>setMScope(e.target.value)}>
                    <option value="person">{t.toPerson}</option>
                    {role==="meister" && <option value="shift">{t.myShift} {crew}</option>}
                    {role==="hr" && (
                      <>
                        <option value="company">{t.allPlants}</option>
                        {[...new Map(coTeams.map(x=>[x.betrieb_id,x.betrieb_name])).entries()].map(([bid,bname])=>(
                          <optgroup key={bid} label={bname}>
                            <option value={"b:"+bid}>{t.wholePlant}</option>
                            {coTeams.filter(x=>x.betrieb_id===bid).map(x=>(
                              <option key={x.team_id} value={"t:"+x.team_id}>{x.team_name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </>
                    )}
                    {role==="bl" && (
                      <>
                        <option value="all">{t.wholePlant}{dbProfile?.betrieb?.name?` · ${dbProfile.betrieb.name}`:""}</option>
                        {teamOpts.map(tm=><option key={tm.id} value={tm.id}>{tm.name}</option>)}
                      </>
                    )}
                  </select>
                </div>
                {mScope==="person" && (()=>{
                  const meId = dbProfile?.id;
                  // Mitarbeiter (mit Nummer) und Führung/Leitung (mit Rolle) getrennt darstellen,
                  // auch wenn HR/Führung in der Mitarbeiterliste auftaucht.
                  const map = new Map();
                  emps.filter(e=>e.id!==meId).forEach(e=> map.set(e.id, {id:e.id, name:e.full_name, role:e.role||"mitarbeiter", pnr:e.personalnummer||null, betrieb:e.betrieb?.name||null}));
                  leadContacts.filter(l=>l.profile_id!==meId).forEach(l=>{ const ex=map.get(l.profile_id); if(ex){ ex.role=l.role; if(l.betrieb_name) ex.betrieb=l.betrieb_name; } else map.set(l.profile_id, {id:l.profile_id, name:l.full_name, role:l.role, pnr:null, betrieb:l.betrieb_name||null}); });
                  // Nur Betriebsleitung/Personal bilden die Gruppe "Leitung / Personal".
                  // Schichtführung (Schichtmeister/Vorarbeiter/Gruppenführer) gehört in die normale Mitarbeiterliste.
                  const LEAD_ROLES = ["betriebsleiter","assistent","personal"];
                  const isLead = p => LEAD_ROLES.includes(p.role);
                  const all = [...map.values()].filter(p=>empMatch({full_name:p.name,personalnummer:p.pnr},empQuery));
                  const mit = all.filter(p=>!isLead(p)).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
                  const led = all.filter(isLead).sort((a,b)=>(a.role==="personal"?2:1)-(b.role==="personal"?2:1) || (a.name||"").localeCompare(b.name||""));
                  const lbl = p => {
                    if(isLead(p)) return `${p.name} · ${leaderRole(p.role)}${(p.betrieb && p.role!=="personal")?` · ${p.betrieb}`:""}`;
                    // Mitarbeiterliste: Personalnummer, sonst (Schichtführung ohne Nummer) die Rolle.
                    const extra = p.pnr ? p.pnr : (p.role && p.role!=="mitarbeiter" ? leaderRole(p.role) : null);
                    return `${p.name}${extra?` · ${extra}`:""}`;
                  };
                  return (
                    <div className="field"><label>{t.recipientLbl}</label>
                      <input value={empQuery} onChange={e=>setEmpQuery(e.target.value)} placeholder={t.searchEmp} style={{marginBottom:8}} />
                      <select className="lang-select" style={selStyle} value={mRecipient} onChange={e=>setMRecipient(e.target.value)}>
                        <option value="">—</option>
                        {mit.map(p=><option key={p.id} value={p.id}>{lbl(p)}</option>)}
                        {led.length>0 && (
                          <optgroup label={t.leadershipLabel}>
                            {led.map(p=><option key={p.id} value={p.id}>{lbl(p)}</option>)}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  );
                })()}
              </>
            )}
            <div className="field"><label>{t.subjectLabel}</label><input value={mSubject} onChange={e=>setMSubject(e.target.value)} /></div>
            <div className="field"><label>{t.msgBody}</label><textarea rows={6} value={mBody} onChange={e=>setMBody(e.target.value)} /></div>
            <label className="mini-btn" style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",marginBottom:12}}>
              <Paperclip size={14}/>{upBusy?"…":t.addFile}
              <input type="file" multiple onChange={onPickFiles} style={{display:"none"}} />
            </label>
            {mFiles.length>0 && <div style={{marginBottom:12}}>
              {mFiles.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,padding:"4px 0"}}>
                  <Paperclip size={13} style={{color:"var(--muted)",flexShrink:0}}/>
                  <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                  <button className="mini-btn danger" onClick={()=>setMFiles(fs=>fs.filter((_,j)=>j!==i))}><X size={13}/></button>
                </div>
              ))}
            </div>}
            <button className="submit" disabled={postBusy || upBusy || !mSubject || !mBody} onClick={doSendMessage}>{postBusy?"…":t.sendMsg}</button>
            {postErr && <div className="login-note" style={{color:"var(--red)",marginTop:10}}>{postErr}</div>}
          </div>
        ) : (
          <>
            {messages.length===0 && <div className="card" style={{marginTop:0}}><div style={{color:"var(--faint)",fontSize:14,textAlign:"center",padding:"20px 0"}}>{t.noMsg}</div></div>}
            {messages.map(m=>(
              <div className="card" key={m.id} style={{marginTop:0,marginBottom:12,cursor:"pointer"}} onClick={()=>openMsg(m)}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {!m.read && <span style={{width:8,height:8,borderRadius:"50%",background:"var(--accent)",flexShrink:0}}/>}
                  <div style={{fontWeight:m.read?600:700,flex:1}}>{m.subject}</div>
                  {m.attachments?.length>0 && <Paperclip size={13} style={{color:"var(--muted)",flexShrink:0}}/>}
                  <span style={{fontSize:11,color:"var(--faint)",whiteSpace:"nowrap"}}>{fmtMsgDate(m.created_at)}</span>
                </div>
                <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{m.senderName} · {m.recipientId?t.personalMsg:(m.teamId?teamNameOf(m.teamId):t.plantWide)}</div>
                {msgOpen===m.id && (
                  <>
                    <div style={{fontSize:14,color:"var(--text)",marginTop:12,lineHeight:1.55,whiteSpace:"pre-wrap"}}>{m.body}</div>
                    {m.attachments?.length>0 && (
                      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}} onClick={ev=>ev.stopPropagation()}>
                        {m.attachments.map((a,i)=>{
                          const url = attUrls[a.path];
                          const isImg = (a.type||"").startsWith("image/");
                          if(isImg && url) return <img key={i} src={url} alt={a.name} style={{maxWidth:"100%",borderRadius:10,border:"1px solid var(--line)"}} />;
                          return (
                            <a key={i} href={url||undefined} target="_blank" rel="noopener noreferrer"
                               style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--accent)",fontWeight:600,textDecoration:"none",padding:"8px 10px",background:"var(--surface)",border:"1px solid var(--line)",borderRadius:10}}>
                              {isImg?<Paperclip size={15}/>:<Download size={15}/>}<span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {m.senderId && m.senderId!==dbProfile?.id && (
                      <div style={{marginTop:14}} onClick={ev=>ev.stopPropagation()}>
                        <button className="mini-btn" style={{display:"inline-flex",alignItems:"center",gap:6}} onClick={()=>{ setComposing(true); setPostErr(""); setMScope("person"); setMRecipient(m.senderId); setMSubject("Re: "+m.subject); setMBody(""); setMFiles([]); setEmpQuery(""); setMsgOpen(null); }}><PenSquare size={13}/>{t.reply}</button>
                      </div>
                    )}
                    {m.senderId===dbProfile?.id && (
                      <div style={{marginTop:14}} onClick={ev=>ev.stopPropagation()}>
                        <button className="mini-btn danger" onClick={()=> delConfirm===m.id ? doDeleteMessage(m.id) : setDelConfirm(m.id)}>
                          {delConfirm===m.id ? t.reallyDelete : t.deleteMsg}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </>
        )}
        <div className="foot" style={{marginTop:24}}>PROTOTYP · U. Kebeli</div>
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
              <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
                <button className="mini-btn" onClick={()=>openEdit(r)}>{t.change}</button>
                {r.type==="urlaub" && (
                  wdConfirm===r.id
                    ? <span style={{display:"inline-flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:12,color:"var(--red)"}}>{t.reallyWithdraw}</span>
                        <button className="mini-btn danger" onClick={()=>{ withdrawRequest(r.id); setWdConfirm(null); }}>{t.yes}</button>
                        <button className="mini-btn" onClick={()=>setWdConfirm(null)}>{t.no}</button>
                      </span>
                    : <button className="mini-btn danger" onClick={()=>setWdConfirm(r.id)}>{t.withdraw}</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const themeToggle = (
    <div style={{display:"inline-flex",border:"1px solid var(--line)",borderRadius:9,overflow:"hidden"}}>
      {[["light",t.light,<Sun size={14}/>],["dark",t.dark,<Moon size={14}/>]].map(([v,l,ic])=>(
        <button key={v} onClick={()=>setTheme(v)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 11px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"inherit",
          background: theme===v ? "var(--accent)" : "transparent", color: theme===v ? "#fff" : "var(--muted)"}}>{ic}{l}</button>
      ))}
    </div>
  );
  const settingsSheet = showSettings && (
    <div className="sheet">
      <div className="sheet-hd">
        <button className="navbtn" onClick={()=>setShowSettings(false)}><ChevronLeft size={18}/></button>
        <span className="disp">{t.settings}</span>
      </div>
      <div className="sheet-body">
        <div className="card" style={{marginTop:0}}>
          <div className="row" style={{cursor:"default"}}>
            <span className="row-l"><span className="row-ic"><Languages size={16}/></span>{t.sprache}</span>
            {langPicker}
          </div>
          <div className="row" style={{cursor:"default"}}>
            <span className="row-l"><span className="row-ic"><Sun size={16}/></span>{t.appearance}</span>
            {themeToggle}
          </div>
          {hasSupabaseConfig && (
            <div className="row" onClick={()=>{ setShowSettings(false); openPw(); }}>
              <span className="row-l"><span className="row-ic"><KeyRound size={16}/></span>{t.changePw}</span>
              <ChevronRight size={16} color="var(--faint)"/>
            </div>
          )}
          <div className="row" onClick={()=>{ setShowSettings(false); setShowGuide(true); setGuideOpen(0); }}>
            <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.guideTitle}</span>
            <ChevronRight size={16} color="var(--faint)"/>
          </div>
        </div>
      </div>
    </div>
  );
  // Anleitung: jede Rolle sieht NUR die eigene Anleitung (ma/meister/bl/hr).
  const guideSheet = showGuide && (()=>{
    const topics = (GUIDE[lang] || GUIDE.de)[role] || (GUIDE.de)[role] || [];
    return (
      <div className="sheet">
        <div className="sheet-hd">
          <button className="navbtn" onClick={()=>setShowGuide(false)}><ChevronLeft size={18}/></button>
          <span className="disp">{t.guideTitle}</span>
        </div>
        <div className="sheet-body">
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:14,lineHeight:1.5}}>{t.guideSub}</div>
          {topics.map((tp,i)=>{
            const open = guideOpen===i;
            return (
              <div className="card" key={i} style={{marginTop:0,marginBottom:10}}>
                <div className="row" onClick={()=>setGuideOpen(open?null:i)}>
                  <span className="row-l">
                    <span className="row-ic" style={{background:"var(--accent)",color:"#fff",fontWeight:800,fontSize:13}}>{i+1}</span>
                    <b>{tp.t}</b>
                  </span>
                  <ChevronRight size={16} color="var(--faint)" style={{transform:open?"rotate(90deg)":"none",transition:"transform .15s"}}/>
                </div>
                {open && (
                  <div style={{marginTop:6,paddingLeft:4}}>
                    {tp.s.map((step,j)=>(
                      <div key={j} style={{display:"flex",gap:10,padding:"7px 0",alignItems:"flex-start",borderBottom:j<tp.s.length-1?"1px solid var(--line)":"none"}}>
                        <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",background:"var(--surface2)",border:"1px solid var(--line)",color:"var(--muted)",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>{j+1}</span>
                        <span style={{fontSize:13.5,lineHeight:1.5}}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="foot">PROTOTYP · U. Kebeli</div>
        </div>
      </div>
    );
  })();
  const settingsCard = (
    <div className="card" style={{marginTop:0}}>
      <div className="row" onClick={()=>setShowSettings(true)}>
        <span className="row-l"><span className="row-ic"><Settings size={16}/></span>{t.settings}</span>
        <ChevronRight size={16} color="var(--faint)"/>
      </div>
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

  // Wiederverwendbares Einteilungs-Raster (Meister = bearbeitbar, BL = nur ansehen).
  const renderAssignGrid = ({rows, gridRot, editable, crewName})=>{
    const cols = gridColsFor(weekOff, gridRot);
    const p2 = (n)=>String(n).padStart(2,"0");
    const rng = cols.length ? `${cols[0].date.getDate()}.–${cols[cols.length-1].date.getDate()}. ${t.months[cols[cols.length-1].date.getMonth()].slice(0,3)}` : "";
    const ws = (rows||[]).map(m=>({ ...m, pid:m.id||m.name }));
    return (
      <>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div>
            <div className="disp" style={{fontSize:19,fontWeight:700}}>{t.workAssign} · {t.crewLabel} {crewName}</div>
            {editable && <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{t.workHint1} <b style={{color:"var(--text)"}}>{selStation==="__erase"?t.eraser:selStation}</b> {t.workHint2}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button className="navbtn" onClick={()=>setWeekOff(weekOff-1)}><ChevronLeft size={18}/></button>
            <span style={{fontSize:13,fontWeight:600,minWidth:92,textAlign:"center"}}>{rng}</span>
            <button className="navbtn" onClick={()=>setWeekOff(weekOff+1)}><ChevronRight size={18}/></button>
          </div>
        </div>
        {editable && (
          <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"16px 0"}}>
            {[...STATIONS, ABSENT].map(s=>(
              <button key={s} onClick={()=>setSelStation(s)} style={{padding:"9px 14px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                border: selStation===s?"2.5px solid var(--text)":"1px solid var(--line)", background:stColor(s), color:stText(s)}}>{s}</button>
            ))}
            <button onClick={()=>setSelStation("__erase")} style={{padding:"9px 14px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,
              border: selStation==="__erase"?"2.5px solid var(--text)":"1px solid var(--line)", background:"var(--surface)",color:"var(--muted)"}}><Eraser size={14}/>{t.eraser}</button>
          </div>
        )}
        <div style={{overflowX:"auto",border:"1px solid var(--line)",borderRadius:12,marginTop:editable?0:14}}>
          <table className="agrid">
            <thead><tr>
              <th style={{textAlign:"left"}}>{t.empLbl}</th>
              {cols.map((c,ci)=>(
                <th key={c.iso} style={ci===0?{background:"rgba(47,143,91,.07)"}:undefined}>
                  {c.date.getDate()}.{p2(c.date.getMonth()+1)}.
                  <div style={{fontWeight:500,fontSize:11,color:"var(--muted)",marginTop:2}}>{c.st==="N"?"🌙 "+t.nacht:"☀ "+t.tag}</div>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {ws.length===0 && <tr><td style={{textAlign:"left",color:"var(--faint)",padding:"14px 12px"}} colSpan={cols.length+1}>{t.noEmp}</td></tr>}
              {ws.map(m=>(
                <tr key={m.pid}>
                  <td style={{textAlign:"left",fontStyle:"italic",fontWeight:600}}>{m.name || m.full_name}</td>
                  {cols.map((c,ci)=>{ const leave=onLeaveDay(m.id,c.iso); const v = leave?ABSENT:(assignGrid[m.pid+"__"+c.iso]||null);
                    return (
                      <td key={c.iso} onClick={()=>{ if(editable && !leave) paintCell(m.pid, c.iso); }} style={{cursor:(editable&&!leave)?"pointer":"default",padding:0, background:(!v&&ci===0)?"rgba(47,143,91,.07)":undefined}}>
                        {v ? <div style={{background:stColor(v),color:stText(v),padding:"15px 6px",fontWeight:700,fontSize:12.5}}>{v}</div>
                           : <div style={{padding:"15px 6px",color:"var(--faint)"}}>–</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
            <button className="mini-btn" style={{flex:"1 1 200px",justifyContent:"center"}} onClick={()=>{ const first=cols[0]?.iso; if(!first) return; const list=[]; ws.forEach(m=>{ const val=assignGrid[m.pid+"__"+first]; if(val==null) return; cols.slice(1).forEach(c=>{ if(!onLeaveDay(m.id,c.iso)) list.push([m.pid,c.iso,val]); }); }); bulkAssign(list); }}>{t.copyWeek}</button>
            <button className="mini-btn danger" style={{flex:"1 1 200px",justifyContent:"center"}} onClick={()=>{ const list=[]; ws.forEach(m=>cols.forEach(c=>{ if(assignGrid[m.pid+"__"+c.iso]!=null) list.push([m.pid,c.iso,null]); })); bulkAssign(list); }}>{t.clearAssign}</button>
          </div>
        )}
      </>
    );
  };

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

  // Desktop-Ansicht (Seitenleiste + breiter Inhalt) für Führungsrollen am PC; Mitarbeiter bleiben mobil.
  const rootCls = "app-root"+(theme==="dark"?" theme-dark":"")+((authed && role!=="ma")?" mgmt":"");

  // Türsteher: ohne Anmeldung + DSGVO-Einwilligung kein Zugang.
  // Sitzung wird geprüft (nur Supabase) -> kurzer Ladezustand
  if (hasSupabaseConfig && !dbReady) {
    return (
      <div className={rootCls}>
        <style>{CSS}</style>
        <div className="phone">
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <img src="/setylose-logo.svg" className="brand-logo" alt="SE Tylose" style={{height:34}} />
          </div>
        </div>
      </div>
    );
  }

  // Passwort-Reset-Link geöffnet -> neues Passwort setzen.
  if (recovery) {
    return (
      <div className={rootCls}>
        <style>{CSS}</style>
        <div className="phone">
          <div className="login">
            <div className="login-top">
              <img src="/setylose-logo.svg" className="brand-logo" alt="SE Tylose" />
              {langPicker}
            </div>
            <div className="login-mid">
              <h1 className="disp">{t.setNewPw}</h1>
              <p className="login-sub">{t.setNewPwSub}</p>
              <div className="field"><label>{t.newPw}</label><input type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} autoComplete="new-password" /></div>
              <div className="field"><label>{t.repeatPw}</label><input type="password" value={pwNew2} onChange={e=>setPwNew2(e.target.value)} autoComplete="new-password" /></div>
              <button className="submit" disabled={pwBusy || !pwNew || !pwNew2} onClick={doRecoverySet}>{pwBusy?"…":t.save}</button>
              {pwErr && <div className="login-note" style={{color:"var(--red)",marginTop:12}}>{pwErr}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={rootCls}>
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
                <label>{hasSupabaseConfig ? t.loginIdEmail : t.loginId}</label>
                <input type="text" value={loginId} onChange={e=>setLoginId(e.target.value)}
                  placeholder={hasSupabaseConfig?"10432 · name@firma.de":"10432"} inputMode="text" autoComplete="username" />
              </div>
              <div className="field">
                <label>{t.password}</label>
                <div className="pw-wrap">
                  <input type={showLoginPw?"text":"password"} value={loginPw} onChange={e=>setLoginPw(e.target.value)} autoComplete="current-password" />
                  <button type="button" className="pw-toggle" onClick={()=>setShowLoginPw(v=>!v)}
                    aria-label={showLoginPw?t.pwHide:t.pwShow} title={showLoginPw?t.pwHide:t.pwShow}>
                    {showLoginPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
                <span>{t.consentText}{" "}<a onClick={e=>{e.preventDefault(); setLegal("datenschutz");}}>{t.privacyLink}</a></span>
              </label>
              <button className="submit" disabled={!consent || !loginId || busy || (hasSupabaseConfig && !loginPw)} onClick={doLogin}>
                {busy ? "…" : t.signin}
              </button>
              {authErr && <div className="login-note" style={{color:"var(--red)"}}>{authErr}</div>}
              {hasSupabaseConfig
                ? <div style={{textAlign:"center",marginTop:16}}>
                    <a onClick={()=>{setForgotOpen(true); setForgotEmail(loginId); setForgotSent(false); setForgotErr("");}}
                       style={{color:"var(--accent)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t.forgotLink}</a>
                  </div>
                : <div className="login-note">{t.loginDemo}</div>}
            </div>
          </div>
          {legalSheet}
          {forgotSheet}
        </div>
      </div>
    );
  }

  return (
    <div className={rootCls}>
      <style>{CSS}</style>
      <div className="phone">
        {/* HEADER */}
        <div className="hdr">
          <div className="hdr-top">
            <img src="/setylose-logo.svg" className="brand-logo" alt="SE Tylose" />
            {hasSupabaseConfig && (
              <button className="navbtn" style={{position:"relative",width:"auto",padding:"0 13px",gap:8,fontFamily:"inherit",fontSize:13,fontWeight:600,color:"var(--text)"}} onClick={openPostfach} aria-label={t.postfach}>
                <Inbox size={18}/><span>{t.postfach}</span>
                {unreadCount>0 && <span style={{position:"absolute",top:-6,left:24,minWidth:16,height:16,padding:"0 4px",borderRadius:8,background:"var(--red)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount}</span>}
              </button>
            )}
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
              <span className="chip">{role==="ma"?`${t.crewLabel} ${crew}`:role==="meister"?`${leadTitle} · ${t.crewLabel} ${crew}`:role==="bl"?`${t.roleBL} · GLUTOLIN Betrieb`:t.roleHR}</span>
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

              <div className="card" style={{borderColor:"rgba(0,86,138,.28)"}}>
                <div className="eyebrow" style={{marginBottom:8}}>{t.einteilung}</div>
                <div className="disp" style={{fontSize:22,fontWeight:700,color: myStation ? "var(--nacht)" : "var(--faint)"}}>
                  {myStation || t.notAssigned}
                </div>
                {colleaguesToday.length>0 && (
                  <div style={{marginTop:12,borderTop:"1px solid var(--line)",paddingTop:10}}>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:6,letterSpacing:".04em",textTransform:"uppercase"}}>{t.teamTodayLabel}</div>
                    {colleaguesToday.map(x=>(
                      <div key={x.profile_id} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:13,padding:"3px 0"}}>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.full_name}</span>
                        <span style={{color:x.station?"var(--nacht)":"var(--faint)",fontWeight:600,whiteSpace:"nowrap"}}>{x.station||"—"}</span>
                      </div>
                    ))}
                  </div>
                )}
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

              <div className="stat" style={{marginTop:16}}>
                <div className="k"><Plane size={13}/>{t.urlaubKonto}</div>
                <div className="v amber num">{resturlaub} {t.daysWord}</div>
              </div>

              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {role==="ma" && tab===1 && (
            <>
              {calendarView}
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {role==="ma" && tab===2 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div className="eyebrow" style={{marginBottom:12}}>{t.payslipList}</div>
                {psRows}
                <div className="note"><FileText size={13} style={{flexShrink:0,marginTop:1}}/><span>{t.payslipNote}</span></div>
              </div>

              <div className="card">
                <div className="eyebrow" style={{marginBottom:12}}>{t.urlaubKonto}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                  <span className="num" style={{fontSize:28,fontWeight:700,color:"var(--plus)"}}>{resturlaub}</span>
                  <span style={{color:"var(--muted)",fontSize:14}}>{t.daysWord}</span>
                </div>
              </div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
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
                ].map((r,i)=>(
                  <div className="row" key={i} onClick={r.action||undefined} style={r.action?undefined:{cursor:"default"}}>
                    <span className="row-l"><span className="row-ic">{r.ic}</span>{r.label}</span>
                    <ChevronRight size={16} color="var(--faint)"/>
                  </div>
                ))}
              </div>

              {myRequestsCard}

              <div className="card">
                <div className="row" onClick={()=>setShowSettings(true)}>
                  <span className="row-l"><span className="row-ic"><Settings size={16}/></span>{t.settings}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
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
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {/* ===== SCHICHTMEISTER ===== */}
          {role==="meister" && tab===0 && (
            <>
              <div className="eyebrow">{t.approvalsTitle} · {t.crewLabel} {crew}</div>
              {meisterPending.length===0 && (
                <div className="card" style={{textAlign:"center",color:"var(--muted)",fontSize:14,padding:"30px 16px",marginTop:0}}>
                  <Check size={22} style={{color:"var(--plus)"}}/><div style={{marginTop:8}}>{t.allClear}</div>
                </div>
              )}
              {meisterReqs.map((r,idx)=>{
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
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {role==="meister" && tab===1 && (()=>{
            const workers = hasSupabaseConfig ? team.filter(m=>m.role==="mitarbeiter") : team;
            const onDuty = workers.filter(m=>m.st==="duty").length;
            return (
            <>
              <div className="eyebrow">{t.teamTitle} · {t.crewLabel} {crew}</div>
              <div className="card" style={{marginTop:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"var(--muted)"}}>{t.onDuty}</span>
                <span className="num" style={{fontSize:22,fontWeight:700,color:"var(--plus)"}}>{onDuty} / {workers.length}</span>
              </div>
              <div className="card">
                {workers.map((m,i)=>{ const s=statusMap[m.st]; return (
                  <div className="row" key={m.id||i} style={{cursor:"default"}}>
                    <span className="row-l"><span className="row-ic">{initials(m.name)}</span>{m.name}</span>
                    <span className={"tg "+s.c}>{t[s.k]}</span>
                  </div>
                ); })}
              </div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
            );
          })()}

          {role==="meister" && tab===2 && (
            <>
              {renderAssignGrid({ rows: (hasSupabaseConfig ? team.filter(m=>m.role==="mitarbeiter") : team), gridRot: rot, editable: true, crewName: crew })}
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {role==="meister" && tab===3 && (() => {
            const absC = hasSupabaseConfig
              ? dbRequests.filter(r=>r.status==="genehmigt"||r.status==="geaendert")
              : (ABSENCES[crew] || []);
            const acells = [];
            for(let i=0;i<firstDow;i++) acells.push(null);
            for(let d=1; d<=daysIn; d++){
              const date = new Date(yr,mo,d);
              // Pro PERSON nur einmal zählen; bei Urlaub UND Krank am selben Tag zählt KRANK.
              const seen = new Set();
              const who = absC.filter(a=>absCoversDay(a,date))
                .sort((a,b)=>(a.type==="krank"?0:1)-(b.type==="krank"?0:1))
                .filter(a=>{ const k=a.profileId||a.name; if(seen.has(k)) return false; seen.add(k); return true; });
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
                <div className="foot">PROTOTYP · U. Kebeli</div>
              </>
            );
          })()}

          {role==="meister" && tab===4 && (
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
                <div className="row" onClick={()=>openAdmin()}>
                  <span className="row-l"><span className="row-ic"><Users size={16}/></span>{t.manageEmpMenu}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              <div style={{marginTop:14}}>{settingsCard}</div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
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
                  <div className="row" key={cs.c} onClick={()=>setSelCrew(selCrew===cs.id?null:cs.id)}>
                    <div className="row-l">
                      <span className="row-ic">{cs.c}</span>
                      <div>
                        <div style={{fontWeight:600}}>{t.crewLabel} {cs.c}</div>
                        <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{cs.duty}/{cs.total} {t.statusDuty}{cs.absent>0?` · ${cs.absent} ${t.stActive}`:""}</div>
                      </div>
                    </div>
                    <span style={{display:"flex",alignItems:"center",gap:8}}>
                      {cs.open>0 && <span className="tg s">{cs.open} {t.stPending}</span>}
                      <ChevronRight size={16} color="var(--faint)" style={{transform:selCrew===cs.id?"rotate(90deg)":"none",transition:"transform .15s"}}/>
                    </span>
                  </div>
                ))}
              </div>
              {selCrew!==null && (()=>{
                const cs = crewStats.find(x=>x.id===selCrew); if(!cs) return null;
                const byName = (a,b)=>(a.full_name||"").localeCompare(b.full_name||"");
                const LEAD_ROLES = ["schichtmeister","vorarbeiter","gruppenfuehrer"];
                // Schichtführung zuerst nach Rang (Schichtmeister → Vorarbeiter → Gruppenführer),
                // danach die Mitarbeiter.
                const leadRank = m => LEAD_ROLES.indexOf(m.role);
                const leads = cs.members.filter(m=>LEAD_ROLES.includes(m.role)).sort((a,b)=>leadRank(a)-leadRank(b) || byName(a,b));
                const mem = [...leads, ...cs.members.filter(m=>m.role==="mitarbeiter").sort(byName)];
                const staff = cs.members.filter(m=>m.role==="mitarbeiter").length;
                return (
                  <div className="card">
                    <div className="eyebrow" style={{marginBottom:8}}>{t.crewLabel} {cs.c} · {staff} {t.empLbl}</div>
                    {mem.length===0
                      ? <div style={{color:"var(--faint)",fontSize:14,marginTop:8}}>{t.noEmp}</div>
                      : mem.map(m=>(
                          <div className="row" key={m.id} style={{cursor:"default"}}>
                            <span className="row-l"><span className="row-ic"><Users size={15}/></span>{m.full_name}{LEAD_ROLES.includes(m.role)?<span style={{color:"var(--faint)",fontWeight:500,fontSize:12,marginLeft:6}}>· {leaderRole(m.role)}</span>:""}</span>
                            <span style={{display:"inline-flex",gap:6}}>
                              <button className="mini-btn" title={t.absenceSlip} onClick={()=>downloadEmpAbsencePdf(m)} style={{display:"inline-flex",alignItems:"center",padding:"7px 9px"}}><Download size={15}/></button>
                              <button className="mini-btn" title={t.writeMsg} onClick={()=>{ setShowPostfach(true); setComposing(true); setPostErr(""); setMSubject(""); setMBody(""); setMScope("person"); setMRecipient(m.id); setMFiles([]); setEmpQuery(""); }} style={{display:"inline-flex",alignItems:"center",padding:"7px 9px"}}><Inbox size={15}/></button>
                            </span>
                          </div>
                        ))}
                  </div>
                );
              })()}
              <div className="foot">PROTOTYP · U. Kebeli</div>
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
              <div className="foot">PROTOTYP · U. Kebeli</div>
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
                  const canDecide = r.reqRole==="schichtmeister";  // BL/Assistent genehmigt Schichtmeister-Anträge
                  return (
                    <div key={r.id} style={{padding:"11px 0",borderBottom:"1px solid var(--line)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                        <div className="row-l">
                          <span className="row-ic">{r.type==="krank"?<HeartPulse size={15}/>:<Plane size={15}/>}</span>
                          <div>
                            <div style={{fontWeight:600}}>{r.name} <span style={{color:"var(--faint)",fontWeight:500,fontSize:12}}>· {t.crewLabel} {r.crew}{canDecide?` · ${t.roleMeister}`:""}</span></div>
                            <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{r.type==="urlaub"?t.typeUrlaub:t.typeKrank} · {r.from}{r.to&&r.to!=="—"?" – "+r.to:""}</div>
                          </div>
                        </div>
                        <span className={"tg "+cls}>{label}</span>
                      </div>
                      {canDecide && (!dec ? (
                        r.type==="urlaub" ? (
                          <div style={{display:"flex",gap:8,marginTop:10}}>
                            <button className="btn-approve" onClick={()=>decide(r.id,"approved")}><Check size={15}/>{t.approve}</button>
                            <button className="btn-reject" onClick={()=>decide(r.id,"rejected")}><X size={15}/>{t.reject}</button>
                          </div>
                        ) : (
                          <button className="btn-approve" style={{width:"100%",marginTop:10}} onClick={()=>decide(r.id,"acked")}><Check size={15}/>{t.ack}</button>
                        )
                      ) : (
                        <button className="btn-reject" style={{marginTop:10,padding:"9px 16px"}} onClick={()=>decide(r.id,null)}>{t.change}</button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {role==="bl" && tab===3 && (()=>{
            const tm = teamOpts.find(x=>x.id===eiCrew) || teamOpts[0];
            const gridRot = tm ? {offset:tm.rotation_offset||0, anchorMs:anchorToMs(tm.anchor_date)} : rot;
            const members = emps.filter(e=>e.team_id===(tm&&tm.id) && e.role==="mitarbeiter");
            return (
            <>
              <div className="eyebrow">{t.workAssign}</div>
              <div className="card" style={{marginTop:0,display:"flex",gap:8,flexWrap:"wrap"}}>
                {teamOpts.map(x=>{ const on=(tm&&tm.id)===x.id; return (
                  <button key={x.id} onClick={()=>setEiCrew(x.id)} style={{flex:"1 1 60px",padding:"10px",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    border:on?"2px solid var(--accent)":"1px solid var(--line)", background:on?"var(--accent)":"var(--surface)", color:on?"#fff":"var(--text)"}}>{x.name}</button>
                ); })}
              </div>
              <div style={{marginTop:16}}>
                {renderAssignGrid({ rows: members, gridRot, editable:false, crewName: tm ? tm.name.trim().slice(-1).toUpperCase() : "" })}
              </div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
            );
          })()}

          {role==="bl" && tab===4 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div className="row" onClick={()=>openAdmin()}>
                  <span className="row-l"><span className="row-ic"><Users size={16}/></span>{t.manageEmpMenu}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              <div style={{marginTop:14}}>{settingsCard}</div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {/* ===== PERSONALABTEILUNG ===== */}
          {role==="hr" && tab===0 && (
            <>
              <div className="eyebrow">{t.bulkTitle}</div>
              <div className="card" style={{marginTop:0}}>
                <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5,marginBottom:12}}>{t.bulkHint}</div>
                <div className="field"><label>{t.periodLabel}</label>
                  {monthPicker(()=>setPsBulkRes(null))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:psBulkFiles.length?8:12}}>
                  <label className="mini-btn" style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",maxWidth:"100%"}}>
                    <FileText size={14}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.pickPdfs}</span>
                    <input type="file" accept="application/pdf,.pdf" multiple onChange={e=>{ const add=Array.from(e.target.files||[]); setPsBulkFiles(prev=>{ const seen=new Set(prev.map(f=>f.name+f.size)); return [...prev, ...add.filter(f=>!seen.has(f.name+f.size))]; }); setPsBulkRes(null); e.target.value=""; }} style={{display:"none"}} />
                  </label>
                  {psBulkFiles.length>0 && <span style={{fontSize:12,color:"var(--muted)",fontWeight:600}}>{psBulkFiles.length} {t.empLbl}</span>}
                  {psBulkFiles.length>0 && <button type="button" className="mini-btn" onClick={()=>{ setPsBulkFiles([]); setPsBulkRes(null); }} style={{fontSize:12,padding:"6px 10px"}}>{t.remove} · alle</button>}
                </div>
                {psBulkFiles.length>0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {psBulkFiles.map((f,i)=>(
                      <div key={f.name+f.size+i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"var(--surface)",border:"1px solid var(--line)",borderRadius:9,padding:"7px 10px"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:7,overflow:"hidden"}}>
                          <FileText size={13} color="var(--faint)"/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12.5}}>{f.name}</span>
                        </span>
                        <button type="button" className="mini-btn" title={t.remove} aria-label={t.remove} onClick={()=>{ setPsBulkFiles(prev=>prev.filter((_,j)=>j!==i)); setPsBulkRes(null); }} style={{flex:"0 0 auto",padding:"4px 9px",fontWeight:700,lineHeight:1}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="submit" disabled={psBulkBusy || !psPeriod || psBulkFiles.length===0} onClick={doBulkUpload}>{psBulkBusy?"…":t.bulkBtn}</button>
                {psBulkRes && (
                  <div style={{marginTop:12,fontSize:13}}>
                    <div style={{color:"var(--plus)",fontWeight:600}}>✓ {psBulkRes.done.length} {t.bulkDone}</div>
                    {psBulkRes.failed.length>0 && (
                      <div style={{marginTop:8,color:"var(--red)"}}>
                        <div style={{fontWeight:600,marginBottom:4}}>{psBulkRes.failed.length} {t.bulkNoMatch}:</div>
                        {psBulkRes.failed.map((f,i)=><div key={i} style={{fontSize:12,opacity:.85}}>· {f}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="eyebrow" style={{marginTop:20}}>{t.uploadTitle}</div>
              <div className="card" style={{marginTop:0}}>
                <div className="field"><label>{t.empLbl}</label>
                  <input value={empQuery} onChange={e=>setEmpQuery(e.target.value)} placeholder={t.searchEmp} style={{marginBottom:8}} />
                  <select className="lang-select" style={selStyle} value={psEmp} onChange={e=>{ setPsEmp(e.target.value); setPsOk(false); setPsErr(""); loadPsList(e.target.value); }}>
                    <option value="">—</option>
                    {psEmps.filter(e=>empMatch(e,empQuery)).map(e=><option key={e.id} value={e.id}>{e.full_name}{e.personalnummer?` · ${e.personalnummer}`:""}{e.betrieb_name?` · ${e.betrieb_name}`:""}</option>)}
                  </select>
                </div>
                <div className="field"><label>{t.periodLabel}</label>
                  {monthPicker()}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  <label className="mini-btn" style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",maxWidth:"100%"}}>
                    <FileText size={14}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{psFile ? psFile.name : t.pickPdf}</span>
                    <input type="file" accept="application/pdf,.pdf" onChange={e=>{ setPsFile(e.target.files?.[0]||null); setPsOk(false); setPsErr(""); e.target.value=""; }} style={{display:"none"}} />
                  </label>
                  {psFile && <button type="button" className="mini-btn" title={t.remove} aria-label={t.remove} onClick={()=>{ setPsFile(null); setPsOk(false); setPsErr(""); }} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"7px 10px",fontWeight:700,lineHeight:1}}>✕</button>}
                </div>
                <button className="submit" disabled={psBusy || !psEmp || !psPeriod || !psFile} onClick={doUploadPayslip}>{psBusy?"…":t.uploadBtn}</button>
                {psOk && <div className="login-note" style={{color:"var(--plus)",marginTop:10}}>{t.uploadOk}</div>}
                {psErr && <div className="login-note" style={{color:"var(--red)",marginTop:10}}>{psErr}</div>}
              </div>
              {psEmp && (
                <div className="card">
                  <div className="eyebrow" style={{marginBottom:12}}>{t.payslipList} · {psList.length}</div>
                  {psList.length===0 && <div style={{color:"var(--faint)",fontSize:14}}>{t.noPayslips}</div>}
                  {psList.map(p=>{ const [y,mo]=String(p.period).split("-"); return (
                    <div className="row" key={p.id} onClick={()=>openPayslip(p.storage_path)}>
                      <span className="row-l"><span className="row-ic"><FileText size={16}/></span>{t.months[+mo-1]} {y}</span>
                      <span className="row-r">{t.openPdf}<ChevronRight size={15}/></span>
                    </div>); })}
                </div>
              )}
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
          )}

          {role==="hr" && tab===1 && (()=>{
            if(!hasSupabaseConfig && directory.length===0) return (
              <><div className="eyebrow">{t.hrTabs[1]}</div>
                <div className="card" style={{marginTop:0,color:"var(--faint)",fontSize:14}}>{t.previewNote}</div>
                <div className="foot">PROTOTYP · U. Kebeli</div></>
            );
            // Verzeichnis nach Betrieb gruppieren (DB liefert bereits nach Hierarchie sortiert).
            const byB = [];
            directory.forEach(r=>{
              let g = byB.find(x=>x.id===r.betrieb_id);
              if(!g){ g={id:r.betrieb_id, name:r.betrieb_name, people:[]}; byB.push(g); }
              if(r.profile_id) g.people.push(r);
            });
            const roleLabel = { betriebsleiter:t.roleBL, assistent:t.roleAssistent, schichtmeister:t.roleMeister, vorarbeiter:t.roleVorarbeiter, gruppenfuehrer:t.roleGruppenfuehrer, personal:t.roleHR, mitarbeiter:t.roleMA };
            const person = (p, withRole)=>(
              <div className="row" key={p.profile_id} onClick={()=>setDirAction(p)}>
                <span className="row-l"><span className="row-ic">{initials(p.full_name)}</span>{p.full_name}</span>
                <span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
                  {withRole ? (roleLabel[p.role]+(p.team_name?` · ${p.team_name}`:"")) : (p.personalnummer||"")}
                  <ChevronRight size={14} color="var(--faint)"/>
                </span>
              </div>
            );
            return (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12}}>
                  <div className="eyebrow" style={{margin:0}}>{t.hrTabs[1]} · {byB.length}</div>
                  <button className="mini-btn" onClick={()=>openAdmin("leitung")} style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    <Users size={14}/>{t.newLeitung}
                  </button>
                </div>
                {byB.map(b=>{
                  const open = openBetrieb===b.id;
                  const bl  = b.people.filter(p=>p.role==="betriebsleiter");
                  const asi = b.people.filter(p=>p.role==="assistent");
                  const FUE_ORDER = ["schichtmeister","vorarbeiter","gruppenfuehrer"];
                  const fue = b.people.filter(p=>FUE_ORDER.includes(p.role))
                    .sort((a,b)=>FUE_ORDER.indexOf(a.role)-FUE_ORDER.indexOf(b.role) || (a.full_name||"").localeCompare(b.full_name||""));
                  const shifts = [];
                  b.people.filter(p=>p.role==="mitarbeiter").forEach(p=>{
                    const key=p.team_name||t.noTeamCat; let s=shifts.find(x=>x.name===key);
                    if(!s){ s={name:key,members:[]}; shifts.push(s); } s.members.push(p);
                  });
                  return (
                    <div className="card" key={b.id} style={{marginTop:0,marginBottom:12}}>
                      <div className="row" onClick={()=>setOpenBetrieb(open?null:b.id)} style={{cursor:"pointer"}}>
                        <span className="row-l"><span className="row-ic"><Building2 size={16}/></span><b>{b.name}</b></span>
                        <span style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12,color:"var(--muted)"}}>{b.people.length}</span>
                          <ChevronRight size={16} color="var(--faint)" style={{transform:open?"rotate(90deg)":"none",transition:"transform .15s"}}/>
                        </span>
                      </div>
                      {open && (b.people.length===0
                        ? <div style={{color:"var(--faint)",fontSize:13,padding:"8px 2px 2px"}}>{t.noBetriebEmp}</div>
                        : <div style={{marginTop:4}}>
                            {bl.length>0  && <><div className="cat-h">{t.roleBL}</div>{bl.map(p=>person(p))}</>}
                            {asi.length>0 && <><div className="cat-h">{t.roleAssistent}</div>{asi.map(p=>person(p))}</>}
                            {fue.length>0 && <><div className="cat-h">{t.catFuehrung}</div>{fue.map(p=>person(p,true))}</>}
                            {shifts.map(s=>(
                              <React.Fragment key={s.name}>
                                <div className="cat-h">{t.catBelegschaft} · {s.name}</div>
                                {s.members.map(p=>person(p))}
                              </React.Fragment>
                            ))}
                          </div>)}
                    </div>
                  );
                })}
                <div className="foot">PROTOTYP · U. Kebeli</div>
              </>
            );
          })()}

          {role==="hr" && tab===2 && (
            <>
              <div className="eyebrow">{t.hrOverview}</div>
              {hrOverviewContent}
            </>
          )}

          {role==="hr" && tab===3 && (
            <>
              <div className="card" style={{marginTop:0}}>
                <div className="row" onClick={()=>openAdmin("hrteam")}>
                  <span className="row-l"><span className="row-ic"><Users size={16}/></span>{t.hrTeam}</span>
                  <ChevronRight size={16} color="var(--faint)"/>
                </div>
              </div>
              <div style={{marginTop:14}}>{settingsCard}</div>
              <div className="foot">PROTOTYP · U. Kebeli</div>
            </>
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
              {(()=>{ const ff=(iso)=>iso?iso.split("-").reverse().join("."):"—"; return (
                <div style={{display:"flex",gap:10,marginBottom:14}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,color:"var(--muted)",fontWeight:600}}>{t.dFrom}</label>
                    <div style={{marginTop:5,padding:"12px",border:"1px solid var(--plus)",borderRadius:10,background:"var(--plus-soft)",textAlign:"center",fontWeight:700}}>{ff(fFrom)}</div>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,color:"var(--muted)",fontWeight:600}}>{t.dTo}{form==="krank"?` (${t.optional})`:""}</label>
                    <div style={{marginTop:5,padding:"12px",border:"1px solid var(--plus)",borderRadius:10,background:"var(--plus-soft)",textAlign:"center",fontWeight:700}}>{ff(fTo||fFrom)}</div>
                  </div>
                </div>
              ); })()}
              {(()=>{
                const base=new Date(now.getFullYear(),now.getMonth()+fMonthOff,1);
                const yy=base.getFullYear(), mm=base.getMonth();
                const dim=new Date(yy,mm+1,0).getDate(); const fd=(new Date(yy,mm,1).getDay()+6)%7;
                const cells=[]; for(let i=0;i<fd;i++) cells.push(null);
                for(let d=1;d<=dim;d++){ const date=new Date(yy,mm,d); const iso=isoOf(date);
                  cells.push({ d, iso, st:shiftType(date,rot), cnt:leaveCounts[iso]||0,
                    inRange: fFrom && (fTo? (iso>=fFrom&&iso<=fTo) : iso===fFrom), today: iso===isoOf(now) }); }
                return (
                  <div className="card" style={{marginTop:0}}>
                    <div className="cal-hd">
                      <button className="navbtn" onClick={()=>navFMonth(-1)}><ChevronLeft size={18}/></button>
                      <div className="disp">{t.months[mm]} {yy}</div>
                      <button className="navbtn" onClick={()=>navFMonth(1)}><ChevronRight size={18}/></button>
                    </div>
                    <div className="wk">{t.wk.map((w,i)=><span key={i}>{w}</span>)}</div>
                    <div className="grid">
                      {cells.map((c,i)=> c===null ? <div key={i} className="cell empty"/> :
                        <div key={i} className={"cell"+(c.inRange?" pick":"")+(c.today?" today":"")} onClick={()=>selectDay(c.iso)}>
                          {c.cnt>0 && <span className="abs-badge" style={{background:"var(--tag)"}}>{c.cnt}</span>}
                          <span>{c.d}</span>
                          <span className="dot" style={{background: c.st==="T"?"var(--tag)":c.st==="N"?"var(--nacht)":"var(--frei)"}}/>
                        </div>
                      )}
                    </div>
                    <div className="legend" style={{flexWrap:"wrap",gap:"8px 14px"}}>
                      <span><i style={{background:"var(--tag)",borderRadius:"50%"}}/>{t.legTag}</span>
                      <span><i style={{background:"var(--nacht)",borderRadius:"50%"}}/>{t.legNacht}</span>
                      <span><i style={{background:"var(--frei)",borderRadius:"50%"}}/>{t.legFrei}</span>
                      <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{minWidth:15,height:15,padding:"0 3px",borderRadius:8,background:"var(--tag)",color:"#fff",fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>1</span>{t.legLeave}</span>
                    </div>
                  </div>
                );
              })()}
              {form==="urlaub" && fFrom && fTo && (()=>{
                let total=0, shiftDays=0, tagN=0, nachtN=0, overlapDays=0, maxCnt=0;
                const e=new Date(fTo+"T00:00:00");
                for(let dt=new Date(fFrom+"T00:00:00"); dt<=e; dt.setDate(dt.getDate()+1)){ total++;
                  const st=shiftType(dt,rot); if(st==="T"){shiftDays++;tagN++;} else if(st==="N"){shiftDays++;nachtN++;}
                  const cnt=leaveCounts[isoOf(dt)]||0; if(cnt>0){ overlapDays++; if(cnt>maxCnt) maxCnt=cnt; } }
                return (<>
                  <div className="summary" style={{textAlign:"center",marginTop:14}}>{total} {t.daysWord} · {shiftDays} {shiftDays===1?t.shiftDayWord:t.shiftDaysWord} ({tagN} {t.legTag}, {nachtN} {t.legNacht})</div>
                  {maxCnt>=3 && <div className="preview-note" style={{background:"var(--tag-soft)",borderColor:"rgba(199,122,10,.25)",color:"var(--tag)",display:"flex",gap:8,alignItems:"flex-start",marginBottom:0}}><span>⚠️</span><span>{t.overlapNote(overlapDays,maxCnt)}</span></div>}
                </>);
              })()}
              <button className="submit" style={{marginTop:14}} disabled={!fFrom || (form==="urlaub" && !fTo)} onClick={submitRequest}>
                {editId ? t.save : (form==="urlaub" ? t.bindingRequest : t.send)}
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
        {settingsSheet}
        {guideSheet}
        {dirActionSheet}
        {postfachSheet}

        {/* TABBAR */}
        <div className="tabs">
          {(() => {
            const cfg = {
              ma:      {icons:[<Home size={20}/>,<CalendarDays size={20}/>,<Wallet size={20}/>,<LayoutGrid size={20}/>], labels:t.tabs},
              meister: {icons:[<Inbox size={20}/>,<Users size={20}/>,<Grid3x3 size={20}/>,<CalendarDays size={20}/>,<LayoutGrid size={20}/>], labels:t.mTabs},
              bl:      {icons:[<LayoutGrid size={20}/>,<Plane size={20}/>,<Inbox size={20}/>,<Grid3x3 size={20}/>,<Settings size={20}/>], labels:t.blTabs},
              hr:      {icons:[<Wallet size={20}/>,<Building2 size={20}/>,<Inbox size={20}/>,<Settings size={20}/>], labels:t.hrTabs},
            }[role];
            return cfg.icons.map((ic,i)=>(
              <button key={i} className={"tab"+(tab===i?" on":"")} onClick={()=>setTab(i)}>
                <span className="tab-ic">{ic}</span>
                {role==="meister" && i===0 && meisterPending.length>0 && <span className="badge">{meisterPending.length}</span>}
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
