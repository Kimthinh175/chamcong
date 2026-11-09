const API_BASE = (window.location.port === "8099") ? "http://127.0.0.1:8098" : "";
let currentRecords = [];
let usersList = [];
let latestState = {};

function switchTab(tabId, el) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + tabId).classList.add('active');
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

function updateStateUI(state, totalRecords, fileBytes, shownCount) {
  latestState = state || {};
  const pBadge = document.getElementById('pendingBadge');
  if (state.pending_changes > 0) {
    pBadge.className = 'badge warn';
    pBadge.textContent = `⚡ Có ${state.pending_changes} thay đổi chờ Push lên ${state.target_ip}:${state.target_port}`;
  } else {
    pBadge.className = 'badge ok';
    pBadge.textContent = `✓ Đã đồng bộ (0 thay đổi chờ)`;
  }

  document.getElementById('statsText').textContent =
    `Target 4370: ${state.target_ip}:${state.target_port} | Tổng Buffer: ${totalRecords.toLocaleString()} dòng (${(fileBytes / 1024).toFixed(1)} KB) | Đang hiện: ${shownCount} lượt | Pull cuối: ${state.last_pull_at}`;

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
    document.getElementById('protocolLogBox').textContent = (latestState.protocol_log || []).join('\n');
  }
}

async function pullFrom4370() {
  const {ip, port, com_key} = getTargetParams();
  document.getElementById('statsText').textContent = `⏳ Đang kết nối TCP tới ${ip}:${port} để tải ssrattlog.dat & ssruser.dat...`;
  const res = await fetch(`${API_BASE}/api/4370/pull`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ip, port, com_key}),
  });
  const out = await res.json();
  if (out.ok) {
    usersList = [];
    await loadData();
    alert(`📥 Pull thành công từ ${ip}:${port} trong ${out.elapsed_sec}s!\n- Nhân viên (72B): ${out.users_count}\n- Bản ghi chấm công (40B): ${out.records_count.toLocaleString()} (${(out.bytes/1024).toFixed(1)} KB)`);
  } else {
    alert('Lỗi Pull từ cổng 4370: ' + out.error);
  }
}

async function pushTo4370() {
  const {ip, port, com_key} = getTargetParams();
  if (!confirm(`Xác nhận GHI ĐÈ bảng chấm công 40-byte lên thiết bị ${ip}:${port} qua giao thức cổng 4370?\n(Hệ thống sẽ tự động gộp thêm các lượt quẹt thẻ mới phát sinh trên máy nếu có)`)) {
    return;
  }
  const btn = document.getElementById('btnPush4370');
  btn.disabled = true;
  btn.textContent = '⏳ Đang ghi đè 4370...';
  try {
    const res = await fetch(`${API_BASE}/api/4370/push`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ip, port, com_key}),
    });
    const out = await res.json();
    if (out.ok) {
      await loadData();
      alert(`📤 Đã ghi đè thành công ${out.total_records.toLocaleString()} bản ghi 40-byte lên ${ip}:${port} trong ${out.elapsed_sec}s!\n(Tự động giữ lại & gộp ${out.merged_new_swipes} lượt quẹt mới phát sinh)`);
    } else {
      alert('Lỗi Push lên cổng 4370: ' + out.error);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 Ghi đè lên Máy (Push 4370)';
  }
}

async function loadData() {
  const date = document.getElementById('dateFilter').value;
  const user = document.getElementById('userFilter').value;
  const late = document.getElementById('lateFilter').value;

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
    badge.textContent = `✓ Chuẩn 40-Byte & Thứ tự thời gian hợp lệ`;
  } else {
    badge.className = 'badge err';
    badge.textContent = `⚠ Lệch thứ tự tại dòng #${data.out_of_order_at}`;
  }

  updateStateUI(data.state, data.total_in_file, data.file_size_bytes, currentRecords.length);

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const statusMap = {0: 'Mật khẩu (0)', 1: 'Vân tay (1)', 2: 'Thẻ phụ (2)', 4: '💳 Thẻ từ RFID (4)'};

  for (const r of currentRecords) {
    const tags = [];
    if (r.is_first) tags.push(`<span class="first-tag">Lần đầu trong ngày</span>`);
    if (r.is_late) tags.push(`<span class="late-tag">Đi trễ (>08:30)</span>`);

    const tr = document.createElement('tr');
    if (r.is_late) tr.className = 'late-row';
    tr.innerHTML = `
      <td class="mono">#${r.index} <span style="opacity:0.6">(STT:${r.seq})</span></td>
      <td><b>${r.user_id}</b></td>
      <td><b>${r.name}</b></td>
      <td style="font-weight:600; color:${r.is_late ? '#fca5a5' : '#86efac'}">${r.datetime}</td>
      <td class="mono">${r.timestamp}</td>
      <td>${statusMap[r.status] || ('Mã ' + r.status)} / Punch:${r.punch}</td>
      <td>${tags.join(' ')}</td>
      <td class="mono" title="${r.hex}">${r.hex.slice(0, 20)}...${r.hex.slice(54, 64)}</td>
      <td>
        <button class="action-btn" onclick="openEditModal(${r.index})">✏️ Sửa giờ</button>
        ${r.is_late ? `<button class="action-btn warn" onclick="quickSetBefore830(${r.index}, '${r.date}')">⏪ Về < 08:30</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function populateUserDropdowns() {
  const uFilter = document.getElementById('userFilter');
  const uInsert = document.getElementById('insertUser');
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
  const date = document.getElementById('dateFilter').value || '2026-10-20';
  const randMin = Math.floor(Math.random() * 10) + 15;
  const randSec = Math.floor(Math.random() * 59);
  document.getElementById('insertDatetime').value =
    `${date} 08:${String(randMin).padStart(2, '0')}:${String(randSec).padStart(2, '0')}`;
  document.getElementById('insertModal').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
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
    loadData();
  } else {
    alert('Lỗi: ' + out.error);
  }
}

async function loadUsersTable() {
  const res = await fetch(`${API_BASE}/api/users`);
  const data = await res.json();
  usersList = data.users || [];
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';
  const privMap = {0: 'User (0)', 2: 'Enroller (2)', 6: 'Manager (6)', 14: 'Super Admin (14)'};
  for (const u of usersList) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">#${u.uid}</td>
      <td><b>${u.user_id}</b></td>
      <td><b>${u.name}</b></td>
      <td><span class="badge ${u.privilege === 14 ? 'warn' : ''}">${privMap[u.privilege] || u.privilege}</span></td>
      <td class="mono">${u.card}</td>
      <td class="mono">${u.password || '<span style="opacity:0.4">(Trống)</span>'}</td>
      <td class="mono" title="${u.hex}">${u.hex.slice(0, 24)}...</td>
      <td><button class="action-btn" onclick="openUserModal(${u.uid})">✏️ Sửa 72B</button></td>
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
    await loadUsersTable();
    populateUserDropdowns();
    loadData();
  } else {
    alert('Lỗi lưu User qua cổng 4370: ' + out.error);
  }
}

function downloadDat() {
  window.location.href = `${API_BASE}/api/export/dat`;
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

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('zkIp').value = localStorage.getItem('zk4370_ip') || '127.0.0.1';
  document.getElementById('zkPort').value = localStorage.getItem('zk4370_port') || '4370';
  document.getElementById('zkKey').value = localStorage.getItem('zk4370_key') || '0';
  loadData();
});
