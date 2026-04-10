function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeLabelText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function parseDate(value) {
  const raw = normalizeText(value);
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const candidate = new Date(raw);
  if (!Number.isNaN(candidate.getTime())) {
    return candidate.toISOString().slice(0, 10);
  }

  return null;
}

function readValueByLabels(lines, labels) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = normalizeText(lines[i]);
    if (!line) continue;

    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const inlineRegex = new RegExp(`^${escaped}\s*[:\-]\s*(.+)$`, 'i');
      const inlineMatch = line.match(inlineRegex);
      if (inlineMatch && inlineMatch[1]) {
        return normalizeText(inlineMatch[1]);
      }
    }
  }

  return '';
}

function readInlineValueByLabels(lines, labels, stopLabels = []) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = normalizeText(lines[i]);
    if (!line) continue;

    const match = findFirstLabelInLine(line, labels, 0);
    if (!match) continue;

    const valueStart = consumeLabelValue(line, match);
    const stopIndex = findNextAnyLabelInLine(line, stopLabels, valueStart);
    const value = normalizeText(line.slice(valueStart, stopIndex === -1 ? line.length : stopIndex));
    if (value) {
      return value;
    }
  }

  return '';
}

function mapStatus(value) {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return 'active';

  if (raw.includes('ngh') || raw.includes('retired')) {
    return 'retired';
  }

  if (raw.includes('kh') || raw.includes('inactive')) {
    return 'inactive';
  }

  return 'active';
}

function setValueByPath(target, path, value) {
  const parts = String(path || '').split('.');
  if (!parts.length) return;

  let pointer = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!pointer[part] || typeof pointer[part] !== 'object') {
      pointer[part] = {};
    }
    pointer = pointer[part];
  }

  pointer[parts[parts.length - 1]] = value;
}

function hasValidBoundary(text, index, length) {
  const before = index <= 0 ? '' : text[index - 1];
  const after = index + length >= text.length ? '' : text[index + length];
  const isBoundary = (char) => !char || /[\s:;,.()\-\/]/.test(char);
  return isBoundary(before) && isBoundary(after);
}

function findFirstLabelInLine(line, labels, fromIndex) {
  const normalizedLine = normalizeLabelText(line);
  let best = null;

  for (const label of labels) {
    const normalizedLabel = normalizeLabelText(label);
    if (!normalizedLabel) continue;

    let start = Math.max(0, fromIndex || 0);
    while (start < normalizedLine.length) {
      const index = normalizedLine.indexOf(normalizedLabel, start);
      if (index === -1) break;

      if (hasValidBoundary(normalizedLine, index, normalizedLabel.length)) {
        if (!best || index < best.index) {
          best = { index, length: normalizedLabel.length };
        }
        break;
      }

      start = index + 1;
    }
  }

  return best;
}

function findNextAnyLabelInLine(line, labels, fromIndex, requireColonAfter = false) {
  const normalizedLine = normalizeLabelText(line);
  let bestIndex = -1;

  for (const label of labels) {
    const normalizedLabel = normalizeLabelText(label);
    if (!normalizedLabel) continue;

    let start = Math.max(0, fromIndex || 0);
    while (start < normalizedLine.length) {
      const index = normalizedLine.indexOf(normalizedLabel, start);
      if (index === -1) break;

      if (hasValidBoundary(normalizedLine, index, normalizedLabel.length)) {
        if (requireColonAfter) {
          // Verify a colon (label separator) follows the candidate, after optional spaces.
          let afterPos = index + normalizedLabel.length;
          while (afterPos < normalizedLine.length && normalizedLine[afterPos] === ' ') afterPos += 1;
          if (afterPos < normalizedLine.length && normalizedLine[afterPos] !== ':') {
            start = index + 1;
            continue;
          }
        }
        if (bestIndex === -1 || index < bestIndex) {
          bestIndex = index;
        }
        break;
      }

      start = index + 1;
    }
  }

  return bestIndex;
}

function consumeLabelValue(line, match) {
  let valueStart = match.index + match.length;
  while (valueStart < line.length && /\s/.test(line[valueStart])) valueStart += 1;
  if (line[valueStart] === ':' || line[valueStart] === '-') {
    valueStart += 1;
    while (valueStart < line.length && /\s/.test(line[valueStart])) valueStart += 1;
  }
  return valueStart;
}

function parseOrderedLabelValues(lines, orderedSpecs) {
  const values = {};
  let cursorLine = 0;
  let cursorIndex = 0;

  for (let specIndex = 0; specIndex < orderedSpecs.length; specIndex += 1) {
    const spec = orderedSpecs[specIndex];
    let found = false;

    for (let lineIndex = cursorLine; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const startIndex = lineIndex === cursorLine ? cursorIndex : 0;
      const match = findFirstLabelInLine(line, spec.labels, startIndex);
      if (!match) continue;

      const futureLabels = orderedSpecs
        .slice(specIndex + 1)
        .flatMap((futureSpec) => futureSpec.labels);

      // If a future label appears before this match on the same line, skip — the
      // current spec is absent here and the next spec owns this line.
      const precedingFuture = findNextAnyLabelInLine(line, futureLabels, startIndex);
      if (precedingFuture !== -1 && precedingFuture < match.index) continue;

      const valueStart = consumeLabelValue(line, match);
      // requireColonAfter=true: only stop at a future label when it is followed by ':',
      // preventing value text that starts with a label word from being cut short.
      const nextLabelIndex = findNextAnyLabelInLine(line, futureLabels, valueStart, true);
      const rawValue = line.slice(valueStart, nextLabelIndex === -1 ? line.length : nextLabelIndex);

      setValueByPath(values, spec.key, normalizeText(rawValue));
      cursorLine = lineIndex;
      cursorIndex = nextLabelIndex === -1 ? line.length : nextLabelIndex;
      found = true;
      break;
    }

    if (!found) {
      // Keep parser resilient when optional labels are missing.
      continue;
    }
  }

  return values;
}

const VIETNAMESE_LAST_NAMES = [
  'Nguyễn',
  'Phạm',
  'Vũ',
  'Trần',
  'Đặng',
  'Ngô',
  'Lương',
  'Đỗ',
  'Trịnh',
  'Lê',
  'Bùi',
  'Vương',
  'Hoàng',
  'Phan',
  'Mai',
  'Chu',
  'Đinh',
  'Kiều',
  'Đào',
  'Tạ',
  'Dương',
  'Lại',
];

function splitBaptismalAndFullName(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return { saintName: '', fullName: '' };
  }

  let bestStart = -1;
  for (const lastName of VIETNAMESE_LAST_NAMES) {
    const escaped = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)(${escaped})(?=\\s|$)`, 'iu');
    const match = raw.match(regex);
    if (!match) continue;

    const start = match.index + (match[1] ? match[1].length : 0);
    if (bestStart === -1 || start < bestStart) {
      bestStart = start;
    }
  }

  if (bestStart === -1) {
    return { saintName: '', fullName: raw };
  }

  return {
    saintName: normalizeText(raw.slice(0, bestStart)),
    fullName: normalizeText(raw.slice(bestStart)),
  };
}

function parsePriestProfileFromDocxText(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const orderedSpecs = [
    { key: 'nationalId', labels: ['Số CMND (hoặc CCCD)', 'So CMND (hoac CCCD)', 'Số CCCD', 'So CCCD'] },
    { key: 'nationalIdIssuedDate', labels: ['Ngày cấp', 'Ngay cap'] },
    { key: 'nationalIdIssuedPlace', labels: ['Nơi cấp', 'Noi cap'] },
    { key: 'permanentAddress', labels: ['Hộ khẩu thường trú', 'Ho khau thuong tru'] },
    { key: 'permanentResidenceName', labels: ['Thuộc', 'Thuoc'] },
    { key: 'temporaryResidenceAddress', labels: ['Tạm trú tại', 'Tam tru tai'] },
    { key: 'temporaryResidenceName', labels: ['Thuộc', 'Thuoc'] },
    { key: 'phone', labels: ['Số điện thoại di động', 'So dien thoai di dong'] },
    { key: 'email', labels: ['Địa chỉ email', 'Dia chi email', 'Email'] },
    { key: 'diaconate.place', labels: ['Chịu chức Phó tế tại', 'Chiu chuc Pho te tai'] },
    { key: 'diaconate.date', labels: ['Ngày', 'Ngay'] },
    { key: 'diaconate.bishop', labels: ['do Đức Cha', 'do Duc Cha', 'Do Đức Cha', 'Do Duc Cha'] },
    { key: 'priesthood.place', labels: ['Chịu chức Linh Mục tại', 'Chiu chuc Linh Muc tai', 'Chịu chức Linh mục tại', 'Chiu chuc Linh muc tai'] },
    { key: 'priesthood.date', labels: ['Ngày', 'Ngay'] },
    { key: 'priesthood.bishop', labels: ['do Đức Cha', 'do Duc Cha', 'Do Đức Cha', 'Do Duc Cha'] },
    {
      key: 'originalDiocese',
      labels: [
        'Linh mục gốc Giáo phận (hoặc Dòng)',
        'Linh muc goc Giao phan (hoac Dong)',
        'Linh mục gốc Giáo phận / Dòng tu',
        'Linh muc goc Giao phan / Dong tu',
      ],
    },
    { key: 'joinedDioceseDate', labels: ['Gia nhập TGP Hà Nội từ ngày', 'Gia nhap TGP Ha Noi tu ngay'] },
    {
      key: 'saintAndFullName',
      labels: [
        'Tên Thánh/ họ tên',
        'Ten Thanh/ ho ten',
        'Tên Thánh / họ tên',
        'Ten Thanh / ho ten',
        'Họ và tên',
        'Ho va ten',
      ],
    },
    { key: 'dateOfBirth', labels: ['Sinh ngày', 'Sinh ngay', 'Ngày sinh', 'Ngay sinh'] },
    { key: 'placeOfBirth', labels: ['Tại', 'Tai'] },
    { key: 'homeParish', labels: ['Giáo xứ', 'Giao xu'] },
    { key: 'diocese', labels: ['Giáo phận', 'Giao phan'] },
    { key: 'baptism.place', labels: ['Rửa tội tại', 'Rua toi tai'] },
    { key: 'baptism.date', labels: ['Ngày', 'Ngay'] },
    { key: 'confirmation.place', labels: ['Thêm sức tại', 'Them suc tai'] },
    { key: 'confirmation.date', labels: ['Ngày', 'Ngay'] },
    { key: 'fatherName', labels: ['Tên thánh, họ tên Cha', 'Ten thanh, ho ten Cha'] },
    { key: 'motherName', labels: ['Tên thánh, họ tên Mẹ', 'Ten thanh, ho ten Me'] },
    { key: 'familyAddress', labels: ['Địa chỉ (của Ô.B. cố)', 'Dia chi (cua O.B. co)'] },
    { key: 'familyParish', labels: ['Thuộc giáo xứ', 'Thuoc giao xu'] },
  ];

  const orderedValues = parseOrderedLabelValues(lines, orderedSpecs);

  const saintAndFullName = orderedValues.saintAndFullName || readValueByLabels(lines, [
    'Ten Thanh/ ho ten',
    'Tên Thánh/ họ tên',
    'Ten Thanh / ho ten',
    'Tên Thánh / họ tên',
    'Ho va ten',
    'Họ và tên',
    'Ten day du',
    'Tên đầy đủ',
  ]);
  const nameParts = splitBaptismalAndFullName(saintAndFullName);
  const saintNameOnly = readValueByLabels(lines, ['Ten thanh', 'Tên thánh']);

  const profile = {
    saintName: nameParts.saintName || saintNameOnly,
    fullName: nameParts.fullName,
    dateOfBirth: parseDate(orderedValues.dateOfBirth || readValueByLabels(lines, ['Sinh ngay', 'Sinh ngày', 'Ngay sinh', 'Ngày sinh'])),
    placeOfBirth: orderedValues.placeOfBirth || readValueByLabels(lines, ['Noi sinh', 'Nơi sinh']),
    homeCommunity: readValueByLabels(lines, ['Giao ho', 'Giáo họ']),
    homeParish: orderedValues.homeParish || readValueByLabels(lines, ['Giao xu', 'Giáo xứ']),
    diocese: orderedValues.diocese || readValueByLabels(lines, ['Giao phan', 'Giáo phận']),
    phone: orderedValues.phone || readValueByLabels(lines, ['So dien thoai', 'Số điện thoại', 'Dien thoai', 'Điện thoại']),
    email: orderedValues.email || readValueByLabels(lines, ['Email']),
    permanentAddress: orderedValues.permanentAddress || readValueByLabels(lines, ['Ho khau thuong tru', 'Hộ khẩu thường trú']),
    temporaryResidenceName: orderedValues.temporaryResidenceName || readValueByLabels(lines, ['Ten noi tam tru', 'Tên nơi tạm trú']),
    temporaryResidenceAddress: orderedValues.temporaryResidenceAddress || readValueByLabels(lines, ['Dia chi tam tru', 'Địa chỉ tạm trú']),
    nationalId: orderedValues.nationalId || readValueByLabels(lines, ['So CCCD', 'Số CCCD']),
    nationalIdIssuedDate: parseDate(orderedValues.nationalIdIssuedDate || readValueByLabels(lines, ['Ngay cap CCCD', 'Ngày cấp CCCD'])),
    nationalIdIssuedPlace: orderedValues.nationalIdIssuedPlace || readValueByLabels(lines, ['Noi cap CCCD', 'Nơi cấp CCCD']),
    passport: readValueByLabels(lines, ['So Passport', 'Số Passport']),
    passportIssuedDate: parseDate(readValueByLabels(lines, ['Ngay cap Passport', 'Ngày cấp Passport'])),
    passportIssuedPlace: readValueByLabels(lines, ['Noi cap Passport', 'Nơi cấp Passport']),
    healthInsuranceId: readValueByLabels(lines, ['So the Bao hiem y te', 'Số thẻ Bảo hiểm y tế']),
    fatherName: orderedValues.fatherName || '',
    motherName: orderedValues.motherName || '',
    familyAddress: orderedValues.familyAddress || '',
    familyParish: orderedValues.familyParish || '',
    baptism: {
      place: orderedValues.baptism?.place || '',
      date: parseDate(orderedValues.baptism?.date),
    },
    confirmation: {
      place: orderedValues.confirmation?.place || '',
      date: parseDate(orderedValues.confirmation?.date),
    },
    diaconate: {
      place: orderedValues.diaconate?.place || '',
      date: parseDate(orderedValues.diaconate?.date),
      bishop: orderedValues.diaconate?.bishop || '',
    },
    priesthood: {
      place: orderedValues.priesthood?.place || '',
      date: parseDate(orderedValues.priesthood?.date),
      bishop: orderedValues.priesthood?.bishop || '',
    },
    originalDiocese: orderedValues.originalDiocese || readValueByLabels(lines, [
      'Linh mục gốc Giáo phận (hoặc Dòng)',
      'Linh muc goc Giao phan (hoac Dong)',
      'Linh mục gốc Giáo phận / Dòng tu',
      'Linh muc goc Giao phan / Dong tu',
    ]),
    joinedDioceseDate: parseDate(orderedValues.joinedDioceseDate),
    notes: readValueByLabels(lines, ['Ghi chu', 'Ghi chú']),
    status: mapStatus(readValueByLabels(lines, ['Tinh trang', 'Tình trạng'])),
  };

  return profile;
}

module.exports = {
  parsePriestProfileFromDocxText,
};
