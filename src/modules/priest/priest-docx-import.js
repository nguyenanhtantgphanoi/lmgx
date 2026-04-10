function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
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

      const labelRegex = new RegExp(`^${escaped}$`, 'i');
      if (labelRegex.test(line)) {
        for (let j = i + 1; j < lines.length; j += 1) {
          const next = normalizeText(lines[j]);
          if (next) {
            return next;
          }
        }
      }
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

function parsePriestProfileFromDocxText(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const profile = {
    saintName: readValueByLabels(lines, ['Ten thanh', 'Tên thánh']),
    fullName: readValueByLabels(lines, [
      'Ten Thanh/ ho ten',
      'Tên Thánh/ họ tên',
      'Ten Thanh / ho ten',
      'Tên Thánh / họ tên',
      'Ho va ten',
      'Họ và tên',
      'Ten day du',
      'Tên đầy đủ',
    ]),
    dateOfBirth: parseDate(readValueByLabels(lines, ['Sinh ngay', 'Sinh ngày', 'Ngay sinh', 'Ngày sinh'])),
    placeOfBirth: readValueByLabels(lines, ['Noi sinh', 'Nơi sinh']),
    homeCommunity: readValueByLabels(lines, ['Giao ho', 'Giáo họ']),
    homeParish: readValueByLabels(lines, ['Giao xu', 'Giáo xứ']),
    diocese: readValueByLabels(lines, ['Giao phan', 'Giáo phận']),
    phone: readValueByLabels(lines, ['So dien thoai', 'Số điện thoại', 'Dien thoai', 'Điện thoại']),
    email: readValueByLabels(lines, ['Email']),
    permanentAddress: readValueByLabels(lines, ['Ho khau thuong tru', 'Hộ khẩu thường trú']),
    temporaryResidenceName: readValueByLabels(lines, ['Ten noi tam tru', 'Tên nơi tạm trú']),
    temporaryResidenceAddress: readValueByLabels(lines, ['Dia chi tam tru', 'Địa chỉ tạm trú']),
    nationalId: readValueByLabels(lines, ['So CCCD', 'Số CCCD']),
    nationalIdIssuedDate: parseDate(readValueByLabels(lines, ['Ngay cap CCCD', 'Ngày cấp CCCD'])),
    nationalIdIssuedPlace: readValueByLabels(lines, ['Noi cap CCCD', 'Nơi cấp CCCD']),
    passport: readValueByLabels(lines, ['So Passport', 'Số Passport']),
    passportIssuedDate: parseDate(readValueByLabels(lines, ['Ngay cap Passport', 'Ngày cấp Passport'])),
    passportIssuedPlace: readValueByLabels(lines, ['Noi cap Passport', 'Nơi cấp Passport']),
    healthInsuranceId: readValueByLabels(lines, ['So the Bao hiem y te', 'Số thẻ Bảo hiểm y tế']),
    notes: readValueByLabels(lines, ['Ghi chu', 'Ghi chú']),
    status: mapStatus(readValueByLabels(lines, ['Tinh trang', 'Tình trạng'])),
  };

  return profile;
}

module.exports = {
  parsePriestProfileFromDocxText,
};
