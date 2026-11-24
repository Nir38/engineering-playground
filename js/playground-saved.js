// playground-saved.js: "save as a question" sheet and the list of saved questions,
// shown under every playground mode (except free-body diagrams, which are practice already).
import { targetsFor, canSave, loadSaved, addSaved, removeSaved, MODE_NAME, makeSceneQuestion } from './scenes.js';
import { esc } from './text.js';

export function renderSaved(el, { mode, getScene, toast, practice }) {
  const list = loadSaved();
  const canHere = mode !== 'fbd';
  el.innerHTML = `<div class="card pg-saved">
      ${canHere ? `<button class="btn primary block" id="pgSaveQ">💾 שמור את המצב כשאלה לתרגול</button>
      <p class="small muted" style="margin:8px 2px 0">השאלה תופיע בבוחן תחת "השאלות שלי", עם מספרים חדשים בכל פעם.</p>` : '<p class="small muted" style="margin:0">דיאגרמת גוף חופשי היא כבר תרגול. במצבים האחרים אפשר לשמור את המצב כשאלה.</p>'}
      <h3 class="pg-h" style="margin-top:14px">השאלות ששמרתי ${list.length ? `(${list.length})` : ''}</h3>
      ${list.length ? `<ul class="pg-savedlist">${list.map((q) => `<li><div class="grow"><b>${esc(q.name)}</b><span class="small muted">${esc(MODE_NAME[q.mode] || '')} · ${esc(q.created)}</span></div><button class="icon-btn" data-preview="${q.id}" aria-label="תצוגה מקדימה">👁</button><button class="icon-btn" data-delq="${q.id}" aria-label="מחק">✕</button></li>`).join('')}</ul>
        <button class="btn block" id="pgPractice">▶ תרגל את השאלות שלי</button>` : '<p class="small muted">עדיין אין שאלות שמורות.</p>'}
    </div>`;
  const saveBtn = el.querySelector('#pgSaveQ');
  if (saveBtn) saveBtn.onclick = () => {
    const scene = getScene();
    if (!scene || !canSave(mode, scene)) { toast('אין מה לשאול על המצב הזה (למשל מבנה לא יציב)'); return; }
    openSheet(mode, scene, () => renderSaved(el, { mode, getScene, toast, practice }), toast);
  };
  el.querySelectorAll('[data-delq]').forEach((b) => (b.onclick = () => {
    if (!confirm('למחוק את השאלה?')) return;
    removeSaved(b.dataset.delq); renderSaved(el, { mode, getScene, toast, practice }); toast('השאלה נמחקה');
  }));
  el.querySelectorAll('[data-preview]').forEach((b) => (b.onclick = () => {
    const saved = loadSaved().find((q) => q.id === b.dataset.preview); if (!saved) return;
    const q = makeSceneQuestion(saved), m = document.getElementById('modal');
    m.innerHTML = `<div class="sheet"><h3>${esc(saved.name)}</h3><p class="small">${esc(q.q)}</p><div class="diagram-wrap">${q.svg}</div>
      <p class="small muted">תשובה לדוגמה הזאת: <b dir="ltr">${Number(q.answer.toPrecision(4))} ${esc(q.unit)}</b>. בבוחן המספרים יהיו אחרים.</p>
      <div class="btn-row"><button class="btn primary" id="pgPrevClose">סגור</button></div></div>`;
    m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    m.onclick = (e) => { if (e.target === m) close(); };
    m.querySelector('#pgPrevClose').onclick = close;
  }));
  const pr = el.querySelector('#pgPractice'); if (pr) pr.onclick = practice;
}

function openSheet(mode, scene, done, toast) {
  const targets = targetsFor(mode, scene), m = document.getElementById('modal');
  let pick = targets[0].key;
  const nameFor = (k) => `${MODE_NAME[mode]}: ${targets.find((x) => x.key === k).label}`;
  m.innerHTML = `<div class="sheet"><h3>💾 שמירה כשאלה</h3><p class="small muted">מה לשאול? בכל פעם הכוחות, המסות או המידות יוגרלו מחדש, והתשובה תחושב לפי המצב שבנית.</p>
    <div class="chips pg-targets">${targets.map((x, i) => `<button class="chip" data-t="${x.key}" aria-pressed="${i === 0}">${esc(x.label)}</button>`).join('')}</div>
    <label class="pg-namefield"><span class="small muted">שם השאלה</span><input id="pgQName" value="${esc(nameFor(pick))}"></label>
    <div class="btn-row"><button class="btn" id="pgCancel">ביטול</button><button class="btn primary" id="pgDoSave">שמור</button></div></div>`;
  m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = (e) => { if (e.target === m) close(); };
  const nameIn = m.querySelector('#pgQName');
  let edited = false; nameIn.oninput = () => { edited = true; };
  m.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => {
    pick = b.dataset.t; m.querySelectorAll('[data-t]').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    if (!edited) nameIn.value = nameFor(pick);
  }));
  m.querySelector('#pgCancel').onclick = close;
  m.querySelector('#pgDoSave').onclick = () => {
    const ok = addSaved(mode, scene, pick, nameIn.value.trim() || nameFor(pick));
    close(); toast(ok ? '✓ נשמר. תמצא אותו בבוחן תחת "השאלות שלי"' : 'לא הצלחתי לשמור (אחסון חסום)'); done();
  };
}
