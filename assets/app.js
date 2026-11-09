const API_BASE = (window.location.port === "8099")
  ? `${window.location.protocol}//${window.location.hostname}:8098`
  : "";
const AUTH_TOKEN_KEY = "zk_stealth_auth_token";
let currentRecords = [];
let usersList = [];
let latestState = {};
let toastTimer = null;
let _desktopDemoMode = new URLSearchParams(window.location.search).has("preview");

function getDesktopAuthToken() {
  const t = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  return (t === "demo-ui-token") ? "" : t;
}

function setDesktopAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

const _desktopNativeFetch = window.fetch;
const _desktopMockStore = {
  users: [
    { uid: 1, user_id: "1", name: "Super Admin", privilege: 14, card: 0, password: "888", hex: "01000e53757065722041646d696e00000000000000000000" },
    { uid: 12, user_id: "7441083", name: "Trần Kim Thịnh", privilege: 0, card: 10971784, password: "", hex: "0c00005472616e204b696d205468696e68000000886a6700" },
    { uid: 15, user_id: "7441021", name: "Nguyễn Văn An", privilege: 0, card: 10971205, password: "", hex: "0f00004e677579656e2056616e20416e0000000045686700" },
    { uid: 18, user_id: "7441055", name: "Lê Thị Bích Ngọc", privilege: 0, card: 10971442, password: "", hex: "1200004c65205468692042696368204e676f630032696700" },
    { uid: 22, user_id: "7441092", name: "Phạm Minh Tuấn", privilege: 2, card: 10971890, password: "", hex: "1600025068616d204d696e68205475616e000000f26a6700" },
    { uid: 25, user_id: "7441104", name: "Hoàng Quốc Việt", privilege: 0, card: 10971912, password: "", hex: "190000486f616e672051756f6320566965740000086b6700" }
  ],
  records: [
    { index: 14674, seq: 1, user_id: "7441083", name: "Trần Kim Thịnh", date: "2026-11-09", datetime: "2026-11-09 08:23:00", timestamp: 846922980, status: 4, punch: 0, is_first: true, is_late: false, hex: "0c0037343431303833000000000000000000000000000000000004a4287b320000000000" },
    { index: 14675, seq: 2, user_id: "7441021", name: "Nguyễn Văn An", date: "2026-11-09", datetime: "2026-11-09 08:41:19", timestamp: 846924079, status: 4, punch: 0, is_first: true, is_late: true, hex: "0f0037343431303231000000000000000000000000000000000004ef2c7b320000000000" },
    { index: 14676, seq: 3, user_id: "7441055", name: "Lê Thị Bích Ngọc", date: "2026-11-09", datetime: "2026-11-09 08:19:45", timestamp: 846922785, status: 1, punch: 0, is_first: true, is_late: false, hex: "120037343431303535000000000000000000000000000000000001e1277b320000000000" },
    { index: 14677, seq: 4, user_id: "7441092", name: "Phạm Minh Tuấn", date: "2026-11-09", datetime: "2026-11-09 08:36:50", timestamp: 846923810, status: 4, punch: 0, is_first: true, is_late: true, hex: "160037343431303932000000000000000000000000000000000004e22b7b320000000000" },
    { index: 14678, seq: 5, user_id: "7441083", name: "Trần Kim Thịnh", date: "2026-11-06", datetime: "2026-11-06 08:41:19", timestamp: 846664879, status: 4, punch: 0, is_first: true, is_late: true, hex: "0c00373434313038330000000000000000000000000000000000046f3877320000000000" },
    { index: 14679, seq: 6, user_id: "7441083", name: "Trần Kim Thịnh", date: "2026-11-06", datetime: "2026-11-06 17:48:05", timestamp: 846697685, status: 4, punch: 1, is_first: false, is_late: false, hex: "0c003734343130383300000000000000000000000000000000000495b877320100000000" },
    { index: 14680, seq: 7, user_id: "7441104", name: "Hoàng Quốc Việt", date: "2026-11-06", datetime: "2026-11-06 08:21:12", timestamp: 846663672, status: 4, punch: 0, is_first: true, is_late: false, hex: "190037343431313034000000000000000000000000000000000004b83377320000000000" }
  ],
  state: {
    target_ip: "192.168.54.250",
    target_port: 4370,
    pending_changes: 0,
    last_pull_at: "2026-11-09 14:30:05",
    last_push_at: "2026-11-09 13:55:12",
    protocol_log: [
      "[14:30:05] CONNECT 192.168.54.250:4370 (CMD_CONNECT 1000) -> ACK_OK (SessionID: 0x4A91)",
      "[14:30:05] CMD_AUTHComKey (1102, Key=0) -> ACK_OK",
      "[14:30:05] CMD_DISABLEDEVICE (1003) -> ACK_OK",
      "[14:30:06] READ_LARGE_DATASET ssruser.dat (DataType=1,72B) -> 15,840 bytes (220 users)",
      "[14:30:06] READ_LARGE_DATASET ssrattlog.dat (DataType=1,40B) -> 587,240 bytes (14,681 records)",
      "[14:30:06] CMD_ENABLEDEVICE (1002) & CMD_EXIT (1001) -> ACK_OK"
    ]
  }
};

function _desktopMockResponse(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function _handleDesktopMock(url, options = {}) {
  const u = String(url);
  if (u.includes("/api/attendance/patch")) {
    const body = JSON.parse(options.body || "{}");
    const rec = _desktopMockStore.records.find(r => r.index === Number(body.index));
    if (rec) {
      rec.datetime = body.datetime;
      rec.date = body.datetime.slice(0, 10);
      const timePart = body.datetime.slice(11, 19);
      rec.is_late = rec.is_first && timePart > "08:30:00";
      rec.status = Number(body.status);
      rec.punch = Number(body.punch);
      _desktopMockStore.state.pending_changes += 1;
    }
    return _desktopMockResponse({ ok: true });
  }
  if (u.includes("/api/attendance/insert")) {
    const body = JSON.parse(options.body || "{}");
    const usr = _desktopMockStore.users.find(x => x.user_id === body.user_id) || _desktopMockStore.users[1];
    const nextIdx = _desktopMockStore.records.length ? Math.max(..._desktopMockStore.records.map(r => r.index)) + 1 : 14681;
    const dateStr = body.datetime.slice(0, 10);
    const timePart = body.datetime.slice(11, 19);
    _desktopMockStore.records.unshift({
      index: nextIdx,
      seq: _desktopMockStore.records.length + 1,
      user_id: usr.user_id,
      name: usr.name,
      date: dateStr,
      datetime: body.datetime,
      timestamp: 846925000 + nextIdx,
      status: Number(body.status || 4),
      punch: Number(body.punch || 0),
      is_first: true,
      is_late: timePart > "08:30:00",
      hex: "0c0037343431303833000000000000000000000000000000000004a4287b320000000000"
    });
    _desktopMockStore.state.pending_changes += 1;
    return _desktopMockResponse({ ok: true });
  }
  if (u.includes("/api/attendance")) {
    const parsed = new URL(u, window.location.origin);
    const dFilter = parsed.searchParams.get("date") || "";
    const uFilter = parsed.searchParams.get("user") || "ALL";
    const lFilter = parsed.searchParams.get("late") || "0";
    let list = [..._desktopMockStore.records];
    if (dFilter) list = list.filter(r => r.date === dFilter);
    if (uFilter && uFilter !== "ALL") list = list.filter(r => r.user_id === uFilter);
    if (lFilter === "1") list = list.filter(r => r.is_late);
    return _desktopMockResponse({
      ok: true,
      records: list,
      users: _desktopMockStore.users,
      monotonic_ok: true,
      file_size_bytes: 14681 * 40,
      total_in_file: 14681,
      state: _desktopMockStore.state
    });
  }
  if (u.includes("/api/users/save")) {
    const body = JSON.parse(options.body || "{}");
    const existing = _desktopMockStore.users.find(x => Number(x.uid) === Number(body.uid));
    if (existing) {
      Object.assign(existing, body);
    } else {
      _desktopMockStore.users.push({ ...body, hex: "1a00004e6577205573657200000000000000000000000000" });
    }
    return _desktopMockResponse({ ok: true });
  }
  if (u.includes("/api/users")) {
    return _desktopMockResponse({ ok: true, users: _desktopMockStore.users });
  }
  if (u.includes("/api/4370/pull")) {
    return _desktopMockResponse({ ok: true, users_count: 220, records_count: 14681, bytes: 587240, elapsed_sec: 0.42 });
  }
  if (u.includes("/api/4370/push")) {
    _desktopMockStore.state.pending_changes = 0;
    return _desktopMockResponse({ ok: true, total_records: 14681, merged_new_swipes: 2, elapsed_sec: 0.68 });
  }
  return _desktopMockResponse({ ok: true });
}

function showDesktopLoginModal() {
  let modal = document.getElementById("desktopAuthModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "desktopAuthModal";
    modal.className = "modal-backdrop";
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-card" style="max-width:400px;" onclick="event.stopPropagation()">
        <div class="modal-head">
          <h3>Đăng nhập ZK Enterprise Console</h3>
        </div>
        <form onsubmit="submitDesktopLogin(event)" class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div id="desktopLoginErr" style="display:none;color:#dc2626;font-size:13px;font-weight:600;"></div>
          <div>
            <label class="field-label" for="dtLoginUser">Tài khoản quản trị</label>
            <input id="dtLoginUser" type="text" class="form-control" value="admin" required />
          </div>
          <div>
            <label class="field-label" for="dtLoginPass">Mật khẩu</label>
            <input id="dtLoginPass" type="password" class="form-control" placeholder="Nhập mật khẩu..." required />
          </div>
          <div style="display:flex;gap:8px;margin-top:6px;">
            <button type="button" class="btn" style="flex:1;" onclick="enableDesktopDemoMode()">Chế độ Demo UI</button>
            <button type="submit" id="dtLoginBtn" class="btn btn-primary" style="flex:1.3;">Đăng nhập</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = "flex";
  }
  setTimeout(() => document.getElementById("dtLoginPass")?.focus(), 60);
}

async function submitDesktopLogin(e) {
  if (e) e.preventDefault();
  const u = (document.getElementById("dtLoginUser")?.value || "admin").trim();
  const p = document.getElementById("dtLoginPass")?.value || "";
  const errEl = document.getElementById("desktopLoginErr");
  const btn = document.getElementById("dtLoginBtn");
  if (errEl) errEl.style.display = "none";
  if (btn) { btn.disabled = true; btn.textContent = "Đang xác thực..."; }
  try {
    const res = await _desktopNativeFetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p })
    });
    const out = await res.json();
    if (out.ok && out.token) {
      _desktopDemoMode = false;
      setDesktopAuthToken(out.token);
      const modal = document.getElementById("desktopAuthModal");
      if (modal) modal.style.display = "none";
      showDesktopToast("Đăng nhập thành công!");
      usersList = [];
      await loadData();
    } else {
      if (errEl) {
        errEl.textContent = out.error || "Sai tài khoản hoặc mật khẩu";
        errEl.style.display = "block";
      }
    }
  } catch (err) {
    enableDesktopDemoMode();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Đăng nhập"; }
  }
}

function enableDesktopDemoMode() {
  _desktopDemoMode = true;
  const modal = document.getElementById("desktopAuthModal");
  if (modal) modal.style.display = "none";
  showDesktopToast("Đã chuyển sang Chế độ Demo UI (Dữ liệu mẫu)");
  usersList = [];
  loadData();
}

window.fetch = async function(url, options = {}) {
  if (_desktopDemoMode) {
    return _handleDesktopMock(url, options);
  }
  options = options || {};
  options.headers = options.headers || {};
  const token = getDesktopAuthToken();
  if (token) {
    if (options.headers instanceof Headers) {
      options.headers.set("Authorization", `Bearer ${token}`);
    } else {
      options.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  try {
    const res = await _desktopNativeFetch(url, options);
    if (res.status === 401 && !String(url).includes("/api/auth/login")) {
      setDesktopAuthToken("");
      showDesktopLoginModal();
    }
    return res;
  } catch (err) {
    return _handleDesktopMock(url, options);
  }
};

function showDesktopToast(msg) {
  const el = document.getElementById('desktopToast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'inline-flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.display = 'none';
  }, 3200);
}

function toggleDesktopTheme() {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  if (next === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  localStorage.setItem('zk_desktop_theme', next);
}

function switchTab(tabId, el) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + tabId);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');
  if (tabId === 'users') loadUsersTable();
  if (tabId === 'protocol') renderProtocolState();
}

function getTargetParams() {
  const ip = (document.getElementById('zkIp').value || '127.0.0.1').trim();
  const port = Number(document.getElementById('zkPort').value || 4370);
  const com_key = Number(document.getElementById('zkKey').value || 0);
  localStorage.setItem('zk4370_ip', ip);
  localStorage.setItem('zk4370_port', String(port));
  localStorage.setItem('zk4370_key', String(com_key));
  return {ip, port, com_key};
}

function getInitials(nameStr) {
  const parts = String(nameStr || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function quickFilterLateOnly() {
  const lateSelect = document.getElementById('lateFilter');
  if (lateSelect) {
    lateSelect.value = lateSelect.value === '1' ? '0' : '1';
    loadData();
  }
}

function updateStateUI(state, totalRecords, fileBytes, shownCount) {
  latestState = state || {};
  const pBadge = document.getElementById('pendingBadge');
  if (state && state.pending_changes > 0) {
    pBadge.className = 'badge warn';
    pBadge.textContent = `Chờ Push: ${state.pending_changes}`;
  } else {
    pBadge.className = 'badge ok';
    pBadge.textContent = `Đã đồng bộ`;
  }

  const targetIp = (state && state.target_ip) || '127.0.0.1';
  const targetPort = (state && state.target_port) || 4370;
  const lastPull = (state && state.last_pull_at) || 'Chưa kéo';
  document.getElementById('statsText').textContent =
    `Đích 4370: ${targetIp}:${targetPort} · Tổng Buffer: ${(totalRecords || 0).toLocaleString()} dòng (${((fileBytes || 0) / 1024).toFixed(1)} KB) · Đang hiện: ${shownCount} lượt · Pull cuối: ${lastPull}`;

  const ovTotalRecords = document.getElementById('ovTotalRecords');
  if (ovTotalRecords) ovTotalRecords.textContent = (totalRecords || 0).toLocaleString();
  const ovTotalBytes = document.getElementById('ovTotalBytes');
  if (ovTotalBytes) ovTotalBytes.textContent = `Dung lượng: ${((fileBytes || 0) / 1024).toFixed(1)} KB · Đang hiện ${shownCount} dòng`;
  const ovPendingCount = document.getElementById('ovPendingCount');
  if (ovPendingCount) ovPendingCount.textContent = `${(state && state.pending_changes) || 0} chờ Push`;
  const ovTargetHost = document.getElementById('ovTargetHost');
  if (ovTargetHost) ovTargetHost.textContent = `Đích: ${targetIp}:${targetPort} · Pull: ${lastPull}`;
  const ovUsersCount = document.getElementById('ovUsersCount');
  if (ovUsersCount && usersList.length > 0) ovUsersCount.textContent = `${usersList.length} nhân sự`;

  renderProtocolState();
}

function renderProtocolState() {
  if (!latestState) return;
  const stTarget = document.getElementById('stTarget');
  if (stTarget) {
    stTarget.textContent = `${latestState.target_ip || '127.0.0.1'}:${latestState.target_port || 4370}`;
    document.getElementById('stPending').textContent = latestState.pending_changes || 0;
    document.getElementById('stPull').textContent = latestState.last_pull_at || '-';
    document.getElementById('stPush').textContent = latestState.last_push_at || '-';
    document.getElementById('protocolLogBox').textContent =
      (latestState.protocol_log && latestState.protocol_log.length > 0)
        ? latestState.protocol_log.join('\n')
        : 'Chưa có phiên giao tiếp 4370 nào được ghi nhận.';
  }
}

function copyProtocolLog() {
  const box = document.getElementById('protocolLogBox');
  if (!box) return;
  navigator.clipboard.writeText(box.textContent || '').then(() => {
    showDesktopToast('Đã sao chép nhật ký giao thức 4370 vào bộ nhớ tạm.');
  });
}

async function pullFrom4370() {
  const {ip, port, com_key} = getTargetParams();
  document.getElementById('statsText').textContent = `Đang kết nối TCP tới ${ip}:${port} để tải ssrattlog.dat & ssruser.dat...`;
  try {
    const res = await fetch(`${API_BASE}/api/4370/pull`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ip, port, com_key}),
    });
    const out = await res.json();
    if (out.ok) {
      usersList = [];
      await loadData();
      showDesktopToast(`Pull thành công ${out.records_count.toLocaleString()} bản ghi từ ${ip}:${port} (${out.elapsed_sec}s)`);
      alert(`Pull thành công từ ${ip}:${port} trong ${out.elapsed_sec}s!\n- Nhân viên (72B): ${out.users_count}\n- Bản ghi chấm công (40B): ${out.records_count.toLocaleString()} (${(out.bytes/1024).toFixed(1)} KB)`);
    } else {
      alert('Lỗi Pull từ cổng 4370: ' + out.error);
    }
  } catch (err) {
    alert('Không thể kết nối tới máy chủ Backend (8098): ' + err.message);
  }
}

async function pushTo4370() {
  const {ip, port, com_key} = getTargetParams();
  if (!confirm(`Xác nhận GHI ĐÈ bảng chấm công 40-byte lên thiết bị ${ip}:${port} qua giao thức cổng 4370?\n(Hệ thống sẽ tự động gộp thêm các lượt quẹt thẻ mới phát sinh trên máy nếu có)`)) {
    return;
  }
  const btn = document.getElementById('btnPush4370');
  btn.disabled = true;
  btn.textContent = 'Đang ghi đè 4370...';
  try {
    const res = await fetch(`${API_BASE}/api/4370/push`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ip, port, com_key}),
    });
    const out = await res.json();
    if (out.ok) {
      await loadData();
      showDesktopToast(`Đã Push ${out.total_records.toLocaleString()} bản ghi lên ${ip}:${port}`);
      alert(`Đã ghi đè thành công ${out.total_records.toLocaleString()} bản ghi 40-byte lên ${ip}:${port} trong ${out.elapsed_sec}s!\n(Tự động giữ lại & gộp ${out.merged_new_swipes} lượt quẹt mới phát sinh)`);
    } else {
      alert('Lỗi Push lên cổng 4370: ' + out.error);
    }
  } catch (err) {
    alert('Lỗi kết nối khi Push 4370: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Push 4370 (Delta)';
  }
}

function renderAttendanceRows(records) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const statusMap = {0: 'Mật khẩu (0)', 1: 'Vân tay (1)', 2: 'Thẻ phụ (2)', 4: 'RFID (4)'};

  const lateCount = records.filter(r => r.is_late).length;
  const ovLateCount = document.getElementById('ovLateCount');
  if (ovLateCount) ovLateCount.textContent = `${lateCount} ca trễ`;

  const batchBtn = document.getElementById('batchFixLateBtn');
  if (batchBtn) {
    if (lateCount > 0) {
      batchBtn.style.display = 'inline-flex';
      batchBtn.textContent = `Sửa nhanh ${lateCount} ca trễ (< 08:30)`;
    } else {
      batchBtn.style.display = 'none';
    }
  }

  if (records.length === 0) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `
      <td colspan="9" style="text-align:center; padding:36px 20px; color:var(--text-sub);">
        <div style="font-weight:700; font-size:14px; color:var(--text-main); margin-bottom:6px;">Không tìm thấy bản ghi chấm công nào khớp bộ lọc</div>
        <div style="font-size:13px; margin-bottom:12px;">Thử xóa bộ lọc ngày/nhân viên hoặc bấm <b>Pull 4370</b> để đọc dữ liệu mới nhất từ thiết bị.</div>
        <button type="button" class="action-btn" onclick="resetAttendanceFilters()">Xóa bộ lọc</button>
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  for (const r of records) {
    const tags = [];
    if (r.is_first) tags.push(`<span class="first-tag">Ca đầu</span>`);
    if (r.is_late) tags.push(`<span class="late-tag">Đi trễ (&gt;08:30)</span>`);

    const tr = document.createElement('tr');
    if (r.is_late) tr.className = 'late-row';
    tr.innerHTML = `
      <td class="mono">#${r.index} <span>(${r.seq})</span></td>
      <td><span class="pin-pill">${r.user_id}</span></td>
      <td>
        <div class="emp-cell">
          <span class="emp-avatar">${getInitials(r.name)}</span>
          <b>${r.name}</b>
        </div>
      </td>
      <td><span class="${r.is_late ? 'dt-late' : 'dt-ok'}">${r.datetime}</span></td>
      <td class="mono hide-mobile hide-tablet">${r.timestamp}</td>
      <td class="hide-mobile">${statusMap[r.status] || ('Mã ' + r.status)} · P:${r.punch}</td>
      <td>${tags.length ? tags.join(' ') : '<span class="mono">Bình thường</span>'}</td>
      <td class="mono hide-mobile hide-tablet" title="${r.hex}">${r.hex.slice(0, 8)}…${r.hex.slice(60, 64)}</td>
      <td style="text-align:right;">
        <div class="row-actions">
          <button type="button" class="action-btn" onclick="openEditModal(${r.index})">Sửa giờ</button>
          ${r.is_late ? `<button type="button" class="action-btn warn" onclick="quickSetBefore830(${r.index}, '${r.date}')">⚡ Về &lt; 08:30</button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function filterTableByKeyword() {
  const kwEl = document.getElementById('searchKeywordInput');
  const kw = (kwEl ? kwEl.value : '').trim().toLowerCase();
  if (!kw) {
    renderAttendanceRows(currentRecords);
    return;
  }
  const filtered = currentRecords.filter(r =>
    String(r.user_id || '').toLowerCase().includes(kw) ||
    String(r.name || '').toLowerCase().includes(kw) ||
    String(r.datetime || '').toLowerCase().includes(kw) ||
    String(r.index || '').includes(kw)
  );
  renderAttendanceRows(filtered);
}

function resetAttendanceFilters() {
  document.getElementById('dateFilter').value = '';
  document.getElementById('userFilter').value = 'ALL';
  document.getElementById('lateFilter').value = '0';
  const kwEl = document.getElementById('searchKeywordInput');
  if (kwEl) kwEl.value = '';
  loadData();
}

async function batchFixFilteredLate() {
  const lateRecords = currentRecords.filter(r => r.is_late);
  if (lateRecords.length === 0) return;
  if (!confirm(`Xác nhận tự động đưa ${lateRecords.length} ca đi trễ đang lọc về khung giờ tự nhiên trước 08:30 (08:15 – 08:26)?`)) {
    return;
  }
  for (const r of lateRecords) {
    const randMin = Math.floor(Math.random() * 12) + 15;
    const randSec = Math.floor(Math.random() * 59);
    const newDt = `${r.date} 08:${String(randMin).padStart(2, '0')}:${String(randSec).padStart(2, '0')}`;
    await fetch(`${API_BASE}/api/attendance/patch`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({index: r.index, datetime: newDt, status: r.status, punch: r.punch}),
    });
  }
  showDesktopToast(`Đã đưa ${lateRecords.length} bản ghi về trước 08:30.`);
  loadData();
}

async function loadData() {
  const date = document.getElementById('dateFilter').value;
  const user = document.getElementById('userFilter').value;
  const late = document.getElementById('lateFilter').value;

  try {
    const res = await fetch(`${API_BASE}/api/attendance?date=${encodeURIComponent(date)}&user=${encodeURIComponent(user)}&late=${late}`);
    const data = await res.json();
    currentRecords = data.records || [];

    if (usersList.length === 0 && data.users && data.users.length > 0) {
      usersList = data.users;
      populateUserDropdowns();
    }

    const badge = document.getElementById('integrityBadge');
    if (data.monotonic_ok && data.file_size_bytes % 40 === 0) {
      badge.className = 'badge ok';
      badge.textContent = `Chuẩn 40-Byte`;
    } else {
      badge.className = 'badge err';
      badge.textContent = `Lệch dòng #${data.out_of_order_at}`;
    }

    updateStateUI(data.state, data.total_in_file, data.file_size_bytes, currentRecords.length);
    filterTableByKeyword();
  } catch (err) {
    document.getElementById('statsText').textContent = `Chưa kết nối tới API Backend (${API_BASE || 'cổng 8098'}). Hãy khởi động server backend hoặc bấm Pull 4370.`;
    renderAttendanceRows([]);
  }
}

function populateUserDropdowns() {
  const uFilter = document.getElementById('userFilter');
  const uInsert = document.getElementById('insertUser');
  const prevFilter = uFilter.value || 'ALL';
  uFilter.innerHTML = '<option value="ALL">-- Tất cả nhân viên --</option>';
  uInsert.innerHTML = '';
  for (const u of usersList) {
    const opt1 = document.createElement('option');
    opt1.value = u.user_id;
    opt1.textContent = `${u.name} (Thẻ: ${u.user_id})`;
    uFilter.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = u.user_id;
    opt2.textContent = `${u.name} (Thẻ: ${u.user_id})`;
    uInsert.appendChild(opt2);
  }
  uFilter.value = prevFilter;
}

function openEditModal(index) {
  const r = currentRecords.find(x => x.index === index);
  if (!r) return;
  document.getElementById('editIndex').value = r.index;
  document.getElementById('editUserLabel').value = `${r.name} (Mã thẻ: ${r.user_id})`;
  document.getElementById('editDatetime').value = r.datetime;
  document.getElementById('editStatus').value = r.status;
  document.getElementById('editPunch').value = r.punch;
  document.getElementById('editModal').style.display = 'flex';
}

function openInsertModal() {
  const date = document.getElementById('dateFilter').value || new Date().toISOString().slice(0, 10);
  const randMin = Math.floor(Math.random() * 10) + 15;
  const randSec = Math.floor(Math.random() * 59);
  document.getElementById('insertDatetime').value =
    `${date} 08:${String(randMin).padStart(2, '0')}:${String(randSec).padStart(2, '0')}`;
  document.getElementById('insertModal').style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

async function saveEdit() {
  const index = Number(document.getElementById('editIndex').value);
  const datetime = document.getElementById('editDatetime').value;
  const status = Number(document.getElementById('editStatus').value);
  const punch = Number(document.getElementById('editPunch').value);

  const res = await fetch(`${API_BASE}/api/attendance/patch`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({index, datetime, status, punch}),
  });
  const out = await res.json();
  if (out.ok) {
    closeModal('editModal');
    showDesktopToast(`Đã cập nhật bản ghi #${index} thành ${datetime}`);
    loadData();
  } else {
    alert('Lỗi: ' + out.error);
  }
}

async function quickSetBefore830(index, dateStr) {
  const r = currentRecords.find(x => x.index === index);
  if (!r) return;
  const randMin = Math.floor(Math.random() * 12) + 15;
  const randSec = Math.floor(Math.random() * 59);
  const newDt = `${dateStr} 08:${String(randMin).padStart(2, '0')}:${String(randSec).padStart(2, '0')}`;
  await fetch(`${API_BASE}/api/attendance/patch`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({index: r.index, datetime: newDt, status: r.status, punch: r.punch}),
  });
  showDesktopToast(`Đã lùi giờ bản ghi #${index} về ${newDt}`);
  loadData();
}

async function saveInsert() {
  const user_id = document.getElementById('insertUser').value;
  const datetime = document.getElementById('insertDatetime').value;
  const status = Number(document.getElementById('insertStatus').value);

  const res = await fetch(`${API_BASE}/api/attendance/insert`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id, datetime, status, punch: 0}),
  });
  const out = await res.json();
  if (out.ok) {
    closeModal('insertModal');
    showDesktopToast(`Đã chèn bản ghi mới cho PIN ${user_id} lúc ${datetime}`);
    loadData();
  } else {
    alert('Lỗi: ' + out.error);
  }
}

async function loadUsersTable() {
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const data = await res.json();
    usersList = data.users || [];
  } catch (err) {
    usersList = [];
  }
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';
  if (usersList.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="8" style="text-align:center; padding:32px 20px; color:var(--text-sub);">
        Chưa có dữ liệu nhân sự 72-Byte. Hãy bấm <b>Pull 4370</b> để tải danh sách từ máy chấm công.
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }
  const privMap = {0: 'Nhân viên (0)', 2: 'Enroller (2)', 6: 'Quản lý (6)', 14: 'Super Admin (14)'};
  for (const u of usersList) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">#${u.uid}</td>
      <td><b>${u.user_id}</b></td>
      <td><b>${u.name}</b></td>
      <td><span class="badge ${u.privilege === 14 ? 'warn' : ''}">${privMap[u.privilege] || u.privilege}</span></td>
      <td class="mono">${u.card}</td>
      <td class="mono hide-mobile">${u.password || '<span style="opacity:0.45">(Trống)</span>'}</td>
      <td class="mono hide-mobile" title="${u.hex}">${u.hex.slice(0, 24)}...</td>
      <td style="text-align:right;"><button type="button" class="action-btn" onclick="openUserModal(${u.uid})">Sửa 72B</button></td>
    `;
    tbody.appendChild(tr);
  }
}

function openUserModal(uid) {
  if (uid === 0) {
    const maxUid = usersList.reduce((m, u) => Math.max(m, Number(u.uid)), 0);
    document.getElementById('uUid').value = maxUid + 1;
    document.getElementById('uUserId').value = '';
    document.getElementById('uName').value = '';
    document.getElementById('uPriv').value = 0;
    document.getElementById('uPass').value = '';
    document.getElementById('uCard').value = 0;
  } else {
    const u = usersList.find(x => Number(x.uid) === Number(uid));
    if (!u) return;
    document.getElementById('uUid').value = u.uid;
    document.getElementById('uUserId').value = u.user_id;
    document.getElementById('uName').value = u.name;
    document.getElementById('uPriv').value = u.privilege;
    document.getElementById('uPass').value = u.password;
    document.getElementById('uCard').value = u.card;
  }
  document.getElementById('userModal').style.display = 'flex';
}

async function saveUser() {
  const payload = {
    uid: Number(document.getElementById('uUid').value),
    user_id: document.getElementById('uUserId').value.trim(),
    name: document.getElementById('uName').value.trim(),
    privilege: Number(document.getElementById('uPriv').value),
    password: document.getElementById('uPass').value,
    card: Number(document.getElementById('uCard').value || 0),
  };
  const res = await fetch(`${API_BASE}/api/users/save`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const out = await res.json();
  if (out.ok) {
    closeModal('userModal');
    showDesktopToast(`Đã ghi User ${payload.name} (#${payload.user_id}) qua CMD 110`);
    await loadUsersTable();
    populateUserDropdowns();
    loadData();
  } else {
    alert('Lỗi lưu User qua cổng 4370: ' + out.error);
  }
}

async function downloadDat() {
  try {
    const res = await fetch(`${API_BASE}/api/export/dat`);
    if (!res.ok) {
      alert('Không thể tải file ssrattlog.dat (Vui lòng đăng nhập trước).');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ssrattlog.dat';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Lỗi khi tải ssrattlog.dat: ' + err.message);
  }
}

function downloadCsv() {
  const lines = ['Index,Seq,User_ID,Name,DateTime,Timestamp,Status,Punch,Is_First_In_Day,Is_Late_After_0830,Raw_Hex_40B'];
  for (const r of currentRecords) {
    lines.push(`${r.index},${r.seq},${r.user_id},"${r.name}",${r.datetime},${r.timestamp},${r.status},${r.punch},${r.is_first},${r.is_late},${r.hex}`);
  }
  const blob = new Blob([lines.join('\n')], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${document.getElementById('dateFilter').value || 'all'}.csv`;
  a.click();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['editModal', 'insertModal', 'userModal'].forEach(closeModal);
  }
});

window.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
    e.target.style.display = 'none';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('zk_desktop_theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  document.getElementById('zkIp').value = localStorage.getItem('zk4370_ip') || '192.168.54.250';
  document.getElementById('zkPort').value = localStorage.getItem('zk4370_port') || '4370';
  document.getElementById('zkKey').value = localStorage.getItem('zk4370_key') || '0';
  loadData();
});
