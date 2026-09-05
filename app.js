/**
 * CLASSFLOW — Real-time Classroom Communication & Presence Engine
 * Dynamic Timetable, Teacher Broadcasts & Student Check-In
 */

// ============================================================
// DEFAULT INITIAL STATE (PRISTINE HACKATHON DEMO SCENARIO)
// ============================================================

const DEFAULT_STATE = {
  activeRole: 'landing', // 'landing' | 'teacher' | 'student'
  soundEnabled: true,
  selectedClassId: 'cs101',
  classes: {
    cs101: {
      id: 'cs101',
      subject: 'Engineering Mathematics',
      code: 'MATH-301',
      classSection: 'CSE • Semester 3 • Section A',
      instructor: 'Prof. Alan Turing',
      time: '10:00 AM – 11:15 AM',
      room: 'AB-204',
      originalRoom: 'AB-204',
      status: 'scheduled', // 'scheduled' | 'on_the_way' | 'delayed' | 'room_shifted' | 'cancelled'
      totalStudents: 42,
      seatedCount: 27,
      delayMinutes: 0,
      delayTargetTimestamp: null,
      customNote: ''
    },
    cs102: {
      id: 'cs102',
      subject: 'Data Structures & Algorithms',
      code: 'CSE-302',
      classSection: 'CSE • Semester 3 • Section B',
      instructor: 'Prof. Alan Turing',
      time: '11:30 AM – 12:45 PM',
      room: 'AB-305',
      originalRoom: 'AB-305',
      status: 'upcoming',
      totalStudents: 45,
      seatedCount: 0,
      delayMinutes: 0,
      delayTargetTimestamp: null,
      customNote: ''
    },
    cs103: {
      id: 'cs103',
      subject: 'Database Management Systems',
      code: 'CSE-304',
      classSection: 'AI • Semester 3 • Section A',
      instructor: 'Dr. Ada Lovelace',
      time: '01:30 PM – 02:45 PM',
      room: 'CSE-201',
      originalRoom: 'CSE-201',
      status: 'upcoming',
      totalStudents: 38,
      seatedCount: 0,
      delayMinutes: 0,
      delayTargetTimestamp: null,
      customNote: ''
    },
    cs104: {
      id: 'cs104',
      subject: 'Computer Networks',
      code: 'CSE-306',
      classSection: 'CSE • Semester 5 • Section A',
      instructor: 'Prof. Claude Shannon',
      time: '03:00 PM – 04:15 PM',
      room: 'AB-204',
      originalRoom: 'AB-204',
      status: 'upcoming',
      totalStudents: 40,
      seatedCount: 0,
      delayMinutes: 0,
      delayTargetTimestamp: null,
      customNote: ''
    }
  },
  studentCheckedIn: false,
  alerts: [
    {
      id: 'alt-1',
      type: 'info',
      title: 'Class Confirmed',
      message: 'Engineering Mathematics scheduled in Room AB-204 at 10:00 AM.',
      time: '09:45 AM',
      timestamp: Date.now() - 15 * 60 * 1000
    }
  ]
};

// ============================================================
// REACTIVE STATE STORE WITH CROSS-TAB / MULTI-DEVICE SYNC
// ============================================================

let appState = loadSharedState();
let syncChannel = null;

try {
  syncChannel = new BroadcastChannel('classflow_sync_channel');
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'STATE_UPDATE') {
      appState = event.data.payload;
      renderAll();
      showSyncBadge();
    }
  };
} catch (e) {
  console.warn('BroadcastChannel not supported, falling back to storage event', e);
}

window.addEventListener('storage', (event) => {
  if (event.key === 'classflow_shared_state' && event.newValue) {
    try {
      appState = JSON.parse(event.newValue);
      renderAll();
      showSyncBadge();
    } catch (err) {
      console.error('Error parsing synced state', err);
    }
  }
});

function loadSharedState() {
  const saved = localStorage.getItem('classflow_shared_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure all keys exist
      return Object.assign({}, DEFAULT_STATE, parsed);
    } catch (e) {
      console.error(e);
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveAndBroadcastState(notifySound = false, soundType = 'info') {
  localStorage.setItem('classflow_shared_state', JSON.stringify(appState));
  if (syncChannel) {
    syncChannel.postMessage({ type: 'STATE_UPDATE', payload: appState });
  }
  renderAll();

  if (notifySound) {
    playChime(soundType);
  }
}

function showSyncBadge() {
  const badge = document.getElementById('demoSyncStatus');
  if (badge) {
    badge.textContent = '🟢 Synced (Live Update)';
    badge.style.color = '#34d399';
    setTimeout(() => {
      badge.textContent = '🟢 Synced (Cross-Tab Active)';
      badge.style.color = '#94a3b8';
    }, 2000);
  }
}

// ============================================================
// AUDIO CHIME SYNTHESIZER (WEB AUDIO API)
// Zero external files, guaranteed playback & crystal clarity
// ============================================================

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChime(type = 'info') {
  if (!appState.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    gain.connect(ctx.destination);
    osc1.connect(gain);
    osc2.connect(gain);

    if (type === 'coming') {
      // Pleasant rising major-third chime (D5 -> F#5 -> A5)
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
      osc2.frequency.setValueAtTime(739.99, now); // F#5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } else if (type === 'delay') {
      // Warm two-tone reminder chime
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(587.33, now + 0.18); // D5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.start(now);
      osc1.stop(now + 0.6);
    } else if (type === 'cancel') {
      // Gentle minor drop alert
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(392.00, now + 0.22); // G4
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.start(now);
      osc1.stop(now + 0.6);
    } else {
      // Standard subtle notification ping
      osc1.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.start(now);
      osc1.stop(now + 0.4);
    }
  } catch (err) {
    console.warn('Audio playback not permitted yet (waiting for first user interaction)', err);
  }
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  saveAndBroadcastState();
  showToast(appState.soundEnabled ? '🔊 Audio Chimes Enabled' : '🔇 Audio Chimes Muted', 'info');
  if (appState.soundEnabled) {
    playChime('info');
  }
}

// ============================================================
// TOAST NOTIFICATION ENGINE
// ============================================================

function showToast(message, type = 'info') {
  const shelf = document.getElementById('toastShelf');
  if (!shelf) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'warning' ? '⏱' : type === 'danger' ? '⚠️' : '📢'}</span>
    <span>${message}</span>
  `;
  shelf.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease-out';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ============================================================
// ROLE NAVIGATION & PERSPECTIVE SWITCHING
// ============================================================

function switchRole(newRole) {
  appState.activeRole = newRole;
  saveAndBroadcastState();

  // Highlight active role in top bar
  const btnTeacher = document.getElementById('btnSwitchTeacher');
  const btnStudent = document.getElementById('btnSwitchStudent');

  if (btnTeacher && btnStudent) {
    btnTeacher.classList.toggle('active', newRole === 'teacher');
    btnStudent.classList.toggle('active', newRole === 'student');
  }

  // Toggle view visibility
  document.getElementById('viewLanding').classList.toggle('active', newRole === 'landing');
  document.getElementById('viewLanding').classList.toggle('hidden', newRole !== 'landing');

  document.getElementById('viewTeacher').classList.toggle('active', newRole === 'teacher');
  document.getElementById('viewTeacher').classList.toggle('hidden', newRole !== 'teacher');

  document.getElementById('viewStudent').classList.toggle('active', newRole === 'student');
  document.getElementById('viewStudent').classList.toggle('hidden', newRole !== 'student');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLanding() {
  switchRole('landing');
}

function startQuickDemo() {
  resetDemoState();
  switchRole('teacher');
  showToast('⚡ Demo Initialized — Step 1: Teacher View Active', 'success');
}

// ============================================================
// LIVE TEACHER BROADCAST CONTROLS
// ============================================================

function getActiveClass() {
  return appState.classes[appState.selectedClassId] || appState.classes.cs101;
}

// 1. On My Way
function handleTeacherOnMyWay() {
  const cls = getActiveClass();
  cls.status = 'on_the_way';
  cls.delayMinutes = 0;
  cls.delayTargetTimestamp = null;

  const alertItem = {
    id: 'alt-' + Date.now(),
    type: 'coming',
    title: 'Teacher On The Way',
    message: `Prof. Alan Turing is en route to Room ${cls.room}. Please return to class.`,
    time: formatTimeOnly(new Date()),
    timestamp: Date.now()
  };
  appState.alerts.unshift(alertItem);

  saveAndBroadcastState(true, 'coming');
  showToast('🚶 Broadcast Sent: "Teacher is on the way"', 'success');
}

// 2. Delay Selector & Countdown
function toggleDelaySelector() {
  const popover = document.getElementById('delayPopover');
  if (popover) {
    popover.classList.toggle('hidden');
  }
}

function handleTeacherDelay(minutes) {
  const cls = getActiveClass();
  cls.status = 'delayed';
  cls.delayMinutes = minutes;
  cls.delayTargetTimestamp = Date.now() + minutes * 60 * 1000;

  const targetTimeStr = formatTimeOnly(new Date(cls.delayTargetTimestamp));
  const alertItem = {
    id: 'alt-' + Date.now(),
    type: 'delay',
    title: `${minutes} Minute Delay`,
    message: `Prof. Turing is running ${minutes}m late. Estimated arrival: ${targetTimeStr}.`,
    time: formatTimeOnly(new Date()),
    timestamp: Date.now()
  };
  appState.alerts.unshift(alertItem);

  toggleDelaySelector();
  saveAndBroadcastState(true, 'delay');
  showToast(`⏱ Delay Broadcasted: +${minutes} min (Arrival at ${targetTimeStr})`, 'warning');
}

function handleClearDelay() {
  const cls = getActiveClass();
  cls.status = 'scheduled';
  cls.delayMinutes = 0;
  cls.delayTargetTimestamp = null;

  toggleDelaySelector();
  saveAndBroadcastState(false);
  showToast('Delay cleared. Status reset to Scheduled.', 'info');
}

// 3. Room Shift
function openRoomShiftModal() {
  const cls = getActiveClass();
  document.getElementById('shiftCurrentRoomText').textContent = cls.room;
  document.getElementById('roomShiftModal').classList.remove('hidden');
}

function closeRoomShiftModal() {
  document.getElementById('roomShiftModal').classList.add('hidden');
}

function confirmRoomShift() {
  const cls = getActiveClass();
  const select = document.getElementById('shiftNewRoomSelect');
  const customNote = document.getElementById('shiftCustomNote').value.trim();
  const oldRoom = cls.room;
  const newRoom = select.value;

  cls.room = newRoom;
  cls.status = 'room_shifted';

  const alertItem = {
    id: 'alt-' + Date.now(),
    type: 'room',
    title: 'Room Changed',
    message: `Classroom relocated: ${oldRoom} → ${newRoom}. ${customNote ? `(${customNote})` : 'Please proceed directly to the new room.'}`,
    time: formatTimeOnly(new Date()),
    timestamp: Date.now()
  };
  appState.alerts.unshift(alertItem);

  closeRoomShiftModal();
  saveAndBroadcastState(true, 'info');
  showToast(`🚪 Room Shift Broadcast: Moved to ${newRoom}`, 'info');
}

// 4. Cancel Class
function openCancelModal() {
  document.getElementById('cancelClassModal').classList.remove('hidden');
}

function closeCancelModal() {
  document.getElementById('cancelClassModal').classList.add('hidden');
}

function confirmClassCancellation() {
  const cls = getActiveClass();
  const reason = document.getElementById('cancelReasonInput').value.trim();

  cls.status = 'cancelled';

  const alertItem = {
    id: 'alt-' + Date.now(),
    type: 'cancel',
    title: 'Class Cancelled',
    message: `Today's ${cls.subject} has been cancelled. Note: ${reason || 'Please check LMS for updates.'}`,
    time: formatTimeOnly(new Date()),
    timestamp: Date.now()
  };
  appState.alerts.unshift(alertItem);

  closeCancelModal();
  saveAndBroadcastState(true, 'cancel');
  showToast('❌ Class Cancelled: Students notified immediately', 'danger');
}

// 5. Custom Announcement
function handleSendCustomAnnouncement() {
  const input = document.getElementById('teacherCustomMsg');
  const msg = input.value.trim();
  if (!msg) return;

  const cls = getActiveClass();
  const alertItem = {
    id: 'alt-' + Date.now(),
    type: 'info',
    title: `Notice from ${cls.instructor}`,
    message: msg,
    time: formatTimeOnly(new Date()),
    timestamp: Date.now()
  };
  appState.alerts.unshift(alertItem);
  input.value = '';

  saveAndBroadcastState(true, 'info');
  showToast('📢 Announcement broadcasted to students', 'info');
}

// Clear log history
function clearAlertHistory() {
  appState.alerts = [];
  saveAndBroadcastState(false);
  showToast('Alert history cleared', 'info');
}

// Select active class from schedule cards
function selectTeacherClass(classId) {
  appState.selectedClassId = classId;
  saveAndBroadcastState(false);
}

// ============================================================
// STUDENT CHECK-IN & PRESENCE LOGIC
// ============================================================

function handleStudentCheckin() {
  const cls = getActiveClass();

  if (!appState.studentCheckedIn) {
    appState.studentCheckedIn = true;
    cls.seatedCount = Math.min(cls.totalStudents, cls.seatedCount + 1);

    const alertItem = {
      id: 'alt-' + Date.now(),
      type: 'info',
      title: 'Student Checked In',
      message: 'Alex Chen checked in at desk in Room ' + cls.room + '.',
      time: formatTimeOnly(new Date()),
      timestamp: Date.now()
    };
    appState.alerts.unshift(alertItem);

    saveAndBroadcastState(true, 'info');
    showToast('✓ You are checked in! Presence updated on Teacher dashboard.', 'success');
  } else {
    appState.studentCheckedIn = false;
    cls.seatedCount = Math.max(0, cls.seatedCount - 1);
    saveAndBroadcastState(false);
    showToast('Check-in status removed.', 'info');
  }
}

// ============================================================
// JURY DEMO SCRIPT GUIDE MODAL
// ============================================================

function toggleDemoGuide() {
  const modal = document.getElementById('demoGuideModal');
  if (modal) {
    modal.classList.toggle('hidden');
  }
}

function resetDemoState() {
  appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveAndBroadcastState(false);
  showToast('🔄 Demo Scenario Reset to Clean Starting State', 'info');
}

// ============================================================
// RENDERERS (TEACHER & STUDENT VIEWS)
// ============================================================

function renderAll() {
  renderTeacherView();
  renderStudentView();
  renderSoundToggles();
}

function renderSoundToggles() {
  const iconT = document.getElementById('soundIconTeacher');
  const labelT = document.getElementById('soundLabelTeacher');
  const iconS = document.getElementById('soundIconStudent');
  const labelS = document.getElementById('soundLabelStudent');

  const text = appState.soundEnabled ? 'Sound On' : 'Sound Off';
  const icon = appState.soundEnabled ? '🔊' : '🔇';

  if (iconT) iconT.textContent = icon;
  if (labelT) labelT.textContent = text;
  if (iconS) iconS.textContent = icon;
  if (labelS) labelS.textContent = text;
}

function renderTeacherView() {
  const cls = getActiveClass();

  // Top metric stats
  const activeCountEl = document.getElementById('teacherActiveClassesVal');
  const statRoomEl = document.getElementById('teacherStatRoom');
  const seatedValEl = document.getElementById('teacherSeatedStatVal');
  const pctEl = document.getElementById('teacherPresencePct');
  const broadcastCountEl = document.getElementById('teacherBroadcastCount');

  if (activeCountEl) activeCountEl.textContent = cls.status === 'cancelled' ? '0' : '1';
  if (statRoomEl) statRoomEl.textContent = cls.room;
  if (seatedValEl) seatedValEl.textContent = `${cls.seatedCount} / ${cls.totalStudents}`;
  if (pctEl) {
    const pct = Math.round((cls.seatedCount / cls.totalStudents) * 100);
    pctEl.textContent = `${pct}% attendance`;
  }
  if (broadcastCountEl) broadcastCountEl.textContent = appState.alerts.length;

  // Live Control Panel
  const subjectEl = document.getElementById('teacherControlSubject');
  const classEl = document.getElementById('teacherControlClass');
  const roomEl = document.getElementById('teacherControlRoom');
  const timeEl = document.getElementById('teacherControlTime');
  const badgeText = document.getElementById('teacherStatusBadgeText');
  const badgeWrapper = document.getElementById('teacherStatusBadge');

  if (subjectEl) subjectEl.textContent = cls.subject;
  if (classEl) classEl.textContent = cls.classSection;
  if (roomEl) roomEl.textContent = cls.room;
  if (timeEl) timeEl.textContent = cls.time;

  // Status Badge in Teacher Panel
  if (badgeText && badgeWrapper) {
    if (cls.status === 'on_the_way') {
      badgeText.textContent = '🟢 TEACHER ON THE WAY';
      badgeWrapper.className = 'badge badge-success';
    } else if (cls.status === 'delayed') {
      badgeText.textContent = `🟡 DELAYED BY ${cls.delayMinutes} MIN`;
      badgeWrapper.className = 'badge badge-warning';
    } else if (cls.status === 'room_shifted') {
      badgeText.textContent = `🔵 ROOM SHIFTED TO ${cls.room}`;
      badgeWrapper.className = 'badge badge-info';
    } else if (cls.status === 'cancelled') {
      badgeText.textContent = '🔴 CLASS CANCELLED';
      badgeWrapper.className = 'badge badge-danger';
    } else {
      badgeText.textContent = '🟢 CLASS SCHEDULED';
      badgeWrapper.className = 'badge badge-live-pill';
    }
  }

  // Countdown Box in Teacher View
  const countdownBox = document.getElementById('teacherCountdownBox');
  const countdownDigits = document.getElementById('teacherCountdownDigits');
  const countdownSub = document.getElementById('teacherCountdownSub');

  if (cls.status === 'delayed' && cls.delayTargetTimestamp) {
    if (countdownBox) countdownBox.classList.remove('hidden');
    if (countdownSub) countdownSub.textContent = `Delayed by ${cls.delayMinutes}m`;
  } else {
    if (countdownBox) countdownBox.classList.add('hidden');
  }

  // Circular Presence Ring
  const roomLabel = document.getElementById('presenceRoomLabel');
  const seatedCountEl = document.getElementById('presenceSeatedCount');
  const totalCountEl = document.getElementById('presenceTotalCount');
  const seatedTextEl = document.getElementById('presenceSeatedText');
  const uncheckTextEl = document.getElementById('presenceUncheckedText');
  const ringFill = document.getElementById('presenceProgressRing');
  const moreBubble = document.getElementById('avatarMoreBubble');

  if (roomLabel) roomLabel.textContent = cls.room;
  if (seatedCountEl) seatedCountEl.textContent = cls.seatedCount;
  if (totalCountEl) totalCountEl.textContent = cls.totalStudents;
  if (seatedTextEl) seatedTextEl.textContent = cls.seatedCount;
  if (uncheckTextEl) uncheckTextEl.textContent = cls.totalStudents - cls.seatedCount;

  if (ringFill) {
    // 2 * PI * 56 = 351.86
    const circumference = 351.86;
    const progress = cls.seatedCount / cls.totalStudents;
    const offset = circumference - progress * circumference;
    ringFill.style.strokeDashoffset = offset;
  }

  if (moreBubble) {
    const extra = Math.max(0, cls.seatedCount - 4);
    moreBubble.textContent = `+${extra}`;
  }

  // Dynamic Schedule Cards List
  const schedContainer = document.getElementById('teacherScheduleCards');
  if (schedContainer) {
    schedContainer.innerHTML = Object.values(appState.classes).map(c => {
      const isSelected = c.id === appState.selectedClassId;
      let badgeHtml = '<span class="badge badge-neutral">UPCOMING</span>';

      if (c.status === 'on_the_way') {
        badgeHtml = '<span class="badge badge-success">ON THE WAY</span>';
      } else if (c.status === 'delayed') {
        badgeHtml = `<span class="badge badge-warning">DELAY +${c.delayMinutes}M</span>`;
      } else if (c.status === 'room_shifted') {
        badgeHtml = `<span class="badge badge-info">${c.room}</span>`;
      } else if (c.status === 'cancelled') {
        badgeHtml = '<span class="badge badge-danger">CANCELLED</span>';
      } else if (c.id === 'cs101') {
        badgeHtml = '<span class="badge badge-success">ON TIME</span>';
      }

      return `
        <div class="schedule-card ${isSelected ? 'active-class-card' : ''}" onclick="selectTeacherClass('${c.id}')">
          <div class="sched-card-top">
            <span class="sched-time">${c.time.split('–')[0].trim()}</span>
            ${badgeHtml}
          </div>
          <h4 class="sched-subject">${c.subject}</h4>
          <div class="sched-meta">
            <span>${c.classSection}</span>
          </div>
          <div class="sched-card-footer">
            <span class="sched-room-badge">📍 Room ${c.room}</span>
            <span>👥 <strong>${c.seatedCount}</strong> / ${c.totalStudents} seated</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Teacher Broadcast History
  const logContainer = document.getElementById('teacherAlertLog');
  if (logContainer) {
    if (appState.alerts.length === 0) {
      logContainer.innerHTML = '<span class="text-muted" style="font-size: 12px;">No broadcasts sent yet today.</span>';
    } else {
      logContainer.innerHTML = appState.alerts.slice(0, 4).map(a => `
        <div class="log-item">
          <span class="log-time">${a.time}</span>
          <span class="log-msg"><strong>${a.title}:</strong> ${a.message}</span>
        </div>
      `).join('');
    }
  }
}

function renderStudentView() {
  const cls = getActiveClass();

  // Summary Metrics
  const summaryRoom = document.getElementById('studentSummaryRoom');
  const alertCount = document.getElementById('studentLiveAlertsCount');
  const headerAlertCount = document.getElementById('studentAlertCount');

  if (summaryRoom) summaryRoom.textContent = cls.room;
  if (alertCount) alertCount.textContent = appState.alerts.length;
  if (headerAlertCount) headerAlertCount.textContent = appState.alerts.length;

  // Next Class Focal Hero Card
  const heroSubject = document.getElementById('studentHeroSubject');
  const heroTime = document.getElementById('studentHeroTime');
  const heroTeacher = document.getElementById('studentHeroTeacher');
  const heroClassTag = document.getElementById('studentHeroClassTag');
  const heroRoomTag = document.getElementById('studentHeroRoomTag');
  const heroStatusText = document.getElementById('studentHeroStatusText');
  const heroStatusBadge = document.getElementById('studentHeroStatusBadge');

  if (heroSubject) heroSubject.textContent = cls.subject;
  if (heroTime) heroTime.textContent = cls.time;
  if (heroTeacher) heroTeacher.textContent = cls.instructor;
  if (heroClassTag) heroClassTag.textContent = cls.classSection;
  if (heroRoomTag) heroRoomTag.innerHTML = `📍 Room <strong>${cls.room}</strong>`;

  // Hero status badge logic
  if (heroStatusText && heroStatusBadge) {
    if (cls.status === 'on_the_way') {
      heroStatusText.innerHTML = '<span class="live-dot pulse"></span> 🟢 TEACHER ON THE WAY';
      heroStatusBadge.className = 'status-pill-badge badge-success';
    } else if (cls.status === 'delayed') {
      heroStatusText.innerHTML = `🟡 DELAYED BY ${cls.delayMinutes} MIN`;
      heroStatusBadge.className = 'status-pill-badge badge-warning';
    } else if (cls.status === 'room_shifted') {
      heroStatusText.innerHTML = `🔵 ROOM CHANGED TO ${cls.room}`;
      heroStatusBadge.className = 'status-pill-badge badge-info';
    } else if (cls.status === 'cancelled') {
      heroStatusText.innerHTML = '🔴 CLASS CANCELLED';
      heroStatusBadge.className = 'status-pill-badge badge-danger';
    } else {
      heroStatusText.innerHTML = '🟢 ON TIME';
      heroStatusBadge.className = 'status-pill-badge badge-success';
    }
  }

  // Check-In Button
  const btnCheckin = document.getElementById('btnStudentCheckin');
  const checkinLabel = document.getElementById('studentCheckinLabel');
  const checkinHelper = document.getElementById('studentCheckinHelper');
  const seatedCountText = document.getElementById('studentSeatedCountText');

  if (seatedCountText) seatedCountText.textContent = cls.seatedCount;

  if (btnCheckin && checkinLabel && checkinHelper) {
    if (appState.studentCheckedIn) {
      btnCheckin.classList.add('seated-active');
      checkinLabel.textContent = '✓ SEATED';
      checkinHelper.textContent = 'You are verified at your desk.';
    } else {
      btnCheckin.classList.remove('seated-active');
      checkinLabel.textContent = "✓ I'M SEATED IN CLASS";
      checkinHelper.textContent = 'Click when you are present at your desk.';
    }
  }

  // Dynamic Banners
  const countdownBanner = document.getElementById('studentCountdownBanner');
  const countdownTitle = document.getElementById('studentCountdownTitle');
  const roomShiftBanner = document.getElementById('studentRoomShiftBanner');
  const roomShiftDesc = document.getElementById('studentRoomShiftDesc');
  const newRoomBadge = document.getElementById('studentNewRoomBadge');
  const cancelledBanner = document.getElementById('studentCancelledBanner');

  // 1. Countdown Banner
  if (cls.status === 'delayed' && cls.delayTargetTimestamp) {
    if (countdownBanner) countdownBanner.classList.remove('hidden');
    if (countdownTitle) countdownTitle.textContent = `Teacher Delayed by ${cls.delayMinutes} Minutes`;
  } else {
    if (countdownBanner) countdownBanner.classList.add('hidden');
  }

  // 2. Room Shift Banner
  if (cls.status === 'room_shifted') {
    if (roomShiftBanner) roomShiftBanner.classList.remove('hidden');
    if (newRoomBadge) newRoomBadge.textContent = `ROOM ${cls.room}`;
    if (roomShiftDesc) {
      roomShiftDesc.innerHTML = `Your class has moved from <strong>${cls.originalRoom}</strong> → <strong class="new-room-text">${cls.room}</strong>. Please proceed to the new room.`;
    }
  } else {
    if (roomShiftBanner) roomShiftBanner.classList.add('hidden');
  }

  // 3. Cancelled Banner
  if (cls.status === 'cancelled') {
    if (cancelledBanner) cancelledBanner.classList.remove('hidden');
  } else {
    if (cancelledBanner) cancelledBanner.classList.add('hidden');
  }

  // Student Full Today's Schedule
  const scheduleList = document.getElementById('studentScheduleList');
  if (scheduleList) {
    scheduleList.innerHTML = Object.values(appState.classes).map((c, idx) => {
      const isCurrent = c.id === 'cs101';
      return `
        <div class="student-sched-item ${isCurrent ? 'current' : ''}">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
              <span class="sched-time">${c.time}</span>
              ${isCurrent ? '<span class="badge badge-primary">ACTIVE NOW</span>' : ''}
            </div>
            <strong style="font-size: 15px; color: var(--text-primary);">${c.subject}</strong>
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              ${c.instructor} • Room ${c.room}
            </p>
          </div>
          <span class="badge ${c.status === 'cancelled' ? 'badge-danger' : isCurrent ? 'badge-success' : 'badge-neutral'}">
            ${c.status === 'cancelled' ? 'CANCELLED' : isCurrent ? 'IN SESSION' : 'UPCOMING'}
          </span>
        </div>
      `;
    }).join('');
  }

  // Live Alerts Feed in Student View
  const alertsContainer = document.getElementById('studentAlertsFeed');
  if (alertsContainer) {
    if (appState.alerts.length === 0) {
      alertsContainer.innerHTML = '<span class="text-muted" style="font-size: 13px;">No alerts posted yet. You are all caught up!</span>';
    } else {
      alertsContainer.innerHTML = appState.alerts.map(a => {
        let cardClass = '';
        let icon = '📢';

        if (a.type === 'coming') {
          cardClass = 'alert-coming';
          icon = '🚶';
        } else if (a.type === 'delay') {
          cardClass = 'alert-delay';
          icon = '⏱';
        } else if (a.type === 'room') {
          cardClass = 'alert-room';
          icon = '🚪';
        } else if (a.type === 'cancel') {
          cardClass = 'alert-cancel';
          icon = '❌';
        }

        return `
          <div class="alert-item-card ${cardClass}">
            <span class="alert-icon">${icon}</span>
            <div class="alert-content">
              <div class="alert-header-row">
                <span class="alert-title-strong">${a.title}</span>
                <span class="alert-timestamp">${a.time}</span>
              </div>
              <p class="alert-body-text">${a.message}</p>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// ============================================================
// TIMERS & CLOCKS (1-SECOND PRECISION TICKER)
// ============================================================

function formatTimeOnly(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function updateClock() {
  const now = new Date();
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const teacherDate = document.getElementById('teacherCurrentDate');
  const teacherTime = document.getElementById('teacherCurrentTime');
  const studentDate = document.getElementById('studentCurrentDate');
  const studentTime = document.getElementById('studentCurrentTime');

  if (teacherDate) teacherDate.textContent = dateStr;
  if (teacherTime) teacherTime.textContent = timeStr;
  if (studentDate) studentDate.textContent = dateStr;
  if (studentTime) studentTime.textContent = timeStr;

  // Update Countdown Timer if active
  const cls = getActiveClass();
  if (cls.status === 'delayed' && cls.delayTargetTimestamp) {
    const diff = Math.max(0, cls.delayTargetTimestamp - Date.now());
    const totalSecs = Math.floor(diff / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const teacherDigits = document.getElementById('teacherCountdownDigits');
    const studentDigits = document.getElementById('studentCountdownDigits');

    if (teacherDigits) teacherDigits.textContent = formatted;
    if (studentDigits) studentDigits.textContent = formatted;

    if (diff === 0 && cls.status === 'delayed') {
      cls.status = 'on_the_way';
      saveAndBroadcastState(true, 'coming');
      showToast('⏱ Delay timer completed: Teacher arriving now!', 'success');
    }
  }
}

// Start ticking
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  // If saved role exists, resume it, otherwise start on landing
  if (appState.activeRole && appState.activeRole !== 'landing') {
    switchRole(appState.activeRole);
  } else {
    switchRole('landing');
  }
});
