// 이 파일은 스크립트로 생성했습니다. 손으로 고치지 마세요.
// 생성 방법: 공공데이터포털 API 로 모든 품목코드를 실제 호출해, 데이터가 오는 품목만 남겼습니다.
// (전체 187개 품목코드 중 97개만 실제로 값이 옵니다. 꽃·중복코드 등은 값이 없어 제외됐습니다.)

/** 화면에 보여줄 분류 */
export const MARKET_GROUPS = ["채소","과일","곡물","축산","수산","버섯·견과","가공품"] as const;
export type MarketGroup = (typeof MARKET_GROUPS)[number];

export interface CatalogItem {
  key: string;
  name: string;
  emoji: string;
  group: MarketGroup;
  /** 부류코드 */
  ctgry: string;
  /** 품목코드 */
  item: string;
  /** 소매 자료가 있는지 */
  retail: boolean;
  /** 도매 자료가 있는지 */
  wholesale: boolean;
}

export const CATALOG: CatalogItem[] = [
  { key: '200_241', name: '건고추', emoji: '🌶️', group: '채소', ctgry: '200', item: '241', retail: true, wholesale: true },
  { key: '200_248', name: '고춧가루', emoji: '🌶️', group: '채소', ctgry: '200', item: '248', retail: true, wholesale: false },
  { key: '200_258', name: '깐마늘(국산)', emoji: '🧄', group: '채소', ctgry: '200', item: '258', retail: true, wholesale: true },
  { key: '200_253', name: '깻잎', emoji: '🌿', group: '채소', ctgry: '200', item: '253', retail: true, wholesale: true },
  { key: '200_232', name: '당근', emoji: '🥕', group: '채소', ctgry: '200', item: '232', retail: true, wholesale: true },
  { key: '200_257', name: '멜론', emoji: '🍈', group: '채소', ctgry: '200', item: '257', retail: true, wholesale: true },
  { key: '200_231', name: '무', emoji: '🥗', group: '채소', ctgry: '200', item: '231', retail: true, wholesale: true },
  { key: '200_252', name: '미나리', emoji: '🌿', group: '채소', ctgry: '200', item: '252', retail: true, wholesale: true },
  { key: '200_422', name: '방울토마토', emoji: '🍅', group: '채소', ctgry: '200', item: '422', retail: true, wholesale: true },
  { key: '200_211', name: '배추', emoji: '🥬', group: '채소', ctgry: '200', item: '211', retail: true, wholesale: true },
  { key: '200_243', name: '붉은고추', emoji: '🌶️', group: '채소', ctgry: '200', item: '243', retail: true, wholesale: true },
  { key: '200_280', name: '브로콜리', emoji: '🥦', group: '채소', ctgry: '200', item: '280', retail: true, wholesale: true },
  { key: '200_214', name: '상추', emoji: '🥬', group: '채소', ctgry: '200', item: '214', retail: true, wholesale: true },
  { key: '200_247', name: '생강', emoji: '🫚', group: '채소', ctgry: '200', item: '247', retail: true, wholesale: true },
  { key: '200_221', name: '수박', emoji: '🍉', group: '채소', ctgry: '200', item: '221', retail: true, wholesale: true },
  { key: '200_213', name: '시금치', emoji: '🥬', group: '채소', ctgry: '200', item: '213', retail: true, wholesale: true },
  { key: '200_279', name: '알배기배추', emoji: '🥬', group: '채소', ctgry: '200', item: '279', retail: true, wholesale: true },
  { key: '200_212', name: '양배추', emoji: '🥬', group: '채소', ctgry: '200', item: '212', retail: true, wholesale: true },
  { key: '200_245', name: '양파', emoji: '🧅', group: '채소', ctgry: '200', item: '245', retail: true, wholesale: true },
  { key: '200_215', name: '얼갈이배추', emoji: '🥬', group: '채소', ctgry: '200', item: '215', retail: true, wholesale: true },
  { key: '200_233', name: '열무', emoji: '🥗', group: '채소', ctgry: '200', item: '233', retail: true, wholesale: true },
  { key: '200_223', name: '오이', emoji: '🥒', group: '채소', ctgry: '200', item: '223', retail: true, wholesale: true },
  { key: '200_222', name: '참외', emoji: '🍈', group: '채소', ctgry: '200', item: '222', retail: true, wholesale: true },
  { key: '200_225', name: '토마토', emoji: '🍅', group: '채소', ctgry: '200', item: '225', retail: true, wholesale: true },
  { key: '200_246', name: '파', emoji: '🌿', group: '채소', ctgry: '200', item: '246', retail: true, wholesale: true },
  { key: '200_256', name: '파프리카', emoji: '🫑', group: '채소', ctgry: '200', item: '256', retail: true, wholesale: true },
  { key: '200_242', name: '풋고추', emoji: '🌶️', group: '채소', ctgry: '200', item: '242', retail: true, wholesale: true },
  { key: '200_244', name: '피마늘', emoji: '🧄', group: '채소', ctgry: '200', item: '244', retail: false, wholesale: true },
  { key: '200_255', name: '피망', emoji: '🫑', group: '채소', ctgry: '200', item: '255', retail: true, wholesale: true },
  { key: '200_224', name: '호박', emoji: '🎃', group: '채소', ctgry: '200', item: '224', retail: true, wholesale: true },
  { key: '400_415', name: '감귤', emoji: '🍊', group: '과일', ctgry: '400', item: '415', retail: true, wholesale: true },
  { key: '400_424', name: '레몬', emoji: '🍋', group: '과일', ctgry: '400', item: '424', retail: true, wholesale: true },
  { key: '400_428', name: '망고', emoji: '🥭', group: '과일', ctgry: '400', item: '428', retail: true, wholesale: true },
  { key: '400_418', name: '바나나', emoji: '🍌', group: '과일', ctgry: '400', item: '418', retail: true, wholesale: true },
  { key: '400_412', name: '배', emoji: '🍐', group: '과일', ctgry: '400', item: '412', retail: true, wholesale: true },
  { key: '400_413', name: '복숭아', emoji: '🍑', group: '과일', ctgry: '400', item: '413', retail: true, wholesale: true },
  { key: '400_411', name: '사과', emoji: '🍎', group: '과일', ctgry: '400', item: '411', retail: true, wholesale: true },
  { key: '400_430', name: '아보카도', emoji: '🥑', group: '과일', ctgry: '400', item: '430', retail: true, wholesale: false },
  { key: '400_421', name: '오렌지', emoji: '🍊', group: '과일', ctgry: '400', item: '421', retail: true, wholesale: true },
  { key: '400_419', name: '참다래', emoji: '🥝', group: '과일', ctgry: '400', item: '419', retail: true, wholesale: false },
  { key: '400_425', name: '체리', emoji: '🍒', group: '과일', ctgry: '400', item: '425', retail: true, wholesale: true },
  { key: '400_420', name: '파인애플', emoji: '🍍', group: '과일', ctgry: '400', item: '420', retail: true, wholesale: true },
  { key: '400_414', name: '포도', emoji: '🍇', group: '과일', ctgry: '400', item: '414', retail: true, wholesale: true },
  { key: '100_152', name: '감자', emoji: '🥔', group: '곡물', ctgry: '100', item: '152', retail: true, wholesale: true },
  { key: '100_151', name: '고구마', emoji: '🍠', group: '곡물', ctgry: '100', item: '151', retail: true, wholesale: true },
  { key: '100_143', name: '녹두', emoji: '🫘', group: '곡물', ctgry: '100', item: '143', retail: true, wholesale: true },
  { key: '100_144', name: '메밀', emoji: '🌾', group: '곡물', ctgry: '100', item: '144', retail: false, wholesale: true },
  { key: '100_111', name: '쌀', emoji: '🌾', group: '곡물', ctgry: '100', item: '111', retail: true, wholesale: true },
  { key: '100_112', name: '찹쌀', emoji: '🌾', group: '곡물', ctgry: '100', item: '112', retail: true, wholesale: true },
  { key: '100_141', name: '콩', emoji: '🫘', group: '곡물', ctgry: '100', item: '141', retail: true, wholesale: true },
  { key: '100_142', name: '팥', emoji: '🫘', group: '곡물', ctgry: '100', item: '142', retail: true, wholesale: true },
  { key: '500_9903', name: '계란', emoji: '🥚', group: '축산', ctgry: '500', item: '9903', retail: true, wholesale: false },
  { key: '500_9901', name: '닭', emoji: '🍗', group: '축산', ctgry: '500', item: '9901', retail: true, wholesale: false },
  { key: '500_4304', name: '돼지', emoji: '🥓', group: '축산', ctgry: '500', item: '4304', retail: true, wholesale: false },
  { key: '500_4301', name: '소', emoji: '🥩', group: '축산', ctgry: '500', item: '4301', retail: true, wholesale: false },
  { key: '500_4402', name: '수입 돼지고기', emoji: '🥓', group: '축산', ctgry: '500', item: '4402', retail: true, wholesale: false },
  { key: '500_4401', name: '수입 소고기', emoji: '🥩', group: '축산', ctgry: '500', item: '4401', retail: true, wholesale: false },
  { key: '500_9908', name: '우유', emoji: '🥛', group: '축산', ctgry: '500', item: '9908', retail: true, wholesale: false },
  { key: '600_613', name: '갈치', emoji: '🐟', group: '수산', ctgry: '600', item: '613', retail: true, wholesale: true },
  { key: '600_660', name: '건다시마', emoji: '🌿', group: '수산', ctgry: '600', item: '660', retail: true, wholesale: true },
  { key: '600_611', name: '고등어', emoji: '🐟', group: '수산', ctgry: '600', item: '611', retail: true, wholesale: true },
  { key: '600_662', name: '고등어필렛', emoji: '🐟', group: '수산', ctgry: '600', item: '662', retail: true, wholesale: false },
  { key: '600_641', name: '김', emoji: '🍙', group: '수산', ctgry: '600', item: '641', retail: true, wholesale: true },
  { key: '600_612', name: '꽁치', emoji: '🐟', group: '수산', ctgry: '600', item: '612', retail: true, wholesale: false },
  { key: '600_656', name: '꽃게', emoji: '🦀', group: '수산', ctgry: '600', item: '656', retail: true, wholesale: false },
  { key: '600_638', name: '마른멸치', emoji: '🐟', group: '수산', ctgry: '600', item: '638', retail: true, wholesale: true },
  { key: '600_642', name: '마른미역', emoji: '🌿', group: '수산', ctgry: '600', item: '642', retail: true, wholesale: true },
  { key: '600_640', name: '마른오징어', emoji: '🦑', group: '수산', ctgry: '600', item: '640', retail: true, wholesale: true },
  { key: '600_651', name: '멸치액젓', emoji: '🫙', group: '수산', ctgry: '600', item: '651', retail: true, wholesale: false },
  { key: '600_615', name: '명태', emoji: '🐟', group: '수산', ctgry: '600', item: '615', retail: true, wholesale: true },
  { key: '600_619', name: '물오징어', emoji: '🦑', group: '수산', ctgry: '600', item: '619', retail: true, wholesale: true },
  { key: '600_661', name: '바지락', emoji: '🐚', group: '수산', ctgry: '600', item: '661', retail: true, wholesale: false },
  { key: '600_639', name: '북어', emoji: '🐟', group: '수산', ctgry: '600', item: '639', retail: false, wholesale: true },
  { key: '600_616', name: '삼치', emoji: '🐟', group: '수산', ctgry: '600', item: '616', retail: true, wholesale: true },
  { key: '600_654', name: '새우', emoji: '🦐', group: '수산', ctgry: '600', item: '654', retail: true, wholesale: true },
  { key: '600_650', name: '새우젓', emoji: '🦐', group: '수산', ctgry: '600', item: '650', retail: true, wholesale: false },
  { key: '600_649', name: '수입조기', emoji: '🐟', group: '수산', ctgry: '600', item: '649', retail: true, wholesale: false },
  { key: '600_653', name: '전복', emoji: '🐚', group: '수산', ctgry: '600', item: '653', retail: true, wholesale: true },
  { key: '600_614', name: '조기', emoji: '🐟', group: '수산', ctgry: '600', item: '614', retail: true, wholesale: false },
  { key: '600_652', name: '천일염', emoji: '🧂', group: '수산', ctgry: '600', item: '652', retail: true, wholesale: false },
  { key: '600_658', name: '홍합', emoji: '🐚', group: '수산', ctgry: '600', item: '658', retail: true, wholesale: true },
  { key: '300_315', name: '느타리버섯', emoji: '🍄', group: '버섯·견과', ctgry: '300', item: '315', retail: true, wholesale: true },
  { key: '300_313', name: '들깨', emoji: '🌰', group: '버섯·견과', ctgry: '300', item: '313', retail: false, wholesale: true },
  { key: '300_314', name: '땅콩', emoji: '🥜', group: '버섯·견과', ctgry: '300', item: '314', retail: true, wholesale: true },
  { key: '300_317', name: '새송이버섯', emoji: '🍄', group: '버섯·견과', ctgry: '300', item: '317', retail: true, wholesale: true },
  { key: '300_319', name: '아몬드', emoji: '🥜', group: '버섯·견과', ctgry: '300', item: '319', retail: true, wholesale: false },
  { key: '300_312', name: '참깨', emoji: '🌰', group: '버섯·견과', ctgry: '300', item: '312', retail: true, wholesale: true },
  { key: '300_316', name: '팽이버섯', emoji: '🍄', group: '버섯·견과', ctgry: '300', item: '316', retail: true, wholesale: true },
  { key: '300_318', name: '호두', emoji: '🥜', group: '버섯·견과', ctgry: '300', item: '318', retail: true, wholesale: false },
  { key: '800_816', name: '간장', emoji: '🫙', group: '가공품', ctgry: '800', item: '816', retail: true, wholesale: false },
  { key: '800_814', name: '고추장', emoji: '🌶️', group: '가공품', ctgry: '800', item: '814', retail: true, wholesale: false },
  { key: '800_813', name: '김치', emoji: '🥬', group: '가공품', ctgry: '800', item: '813', retail: true, wholesale: false },
  { key: '800_815', name: '된장', emoji: '🫘', group: '가공품', ctgry: '800', item: '815', retail: true, wholesale: false },
  { key: '800_812', name: '두부', emoji: '🧊', group: '가공품', ctgry: '800', item: '812', retail: true, wholesale: false },
  { key: '800_817', name: '맛김(조미김)', emoji: '🍙', group: '가공품', ctgry: '800', item: '817', retail: true, wholesale: false },
  { key: '800_811', name: '즉석밥', emoji: '🍚', group: '가공품', ctgry: '800', item: '811', retail: true, wholesale: false },
  { key: '800_818', name: '콩나물', emoji: '🌱', group: '가공품', ctgry: '800', item: '818', retail: true, wholesale: false },
];

/** 지역 선택 (광역 단위). 값이 없으면 전국 평균을 쓴다. */
export const MARKET_REGIONS: { code: string; name: string }[] = [
  { code: '1101', name: '서울' },
  { code: '2100', name: '부산' },
  { code: '2200', name: '대구' },
  { code: '2300', name: '인천' },
  { code: '2401', name: '광주' },
  { code: '2501', name: '대전' },
  { code: '2601', name: '울산' },
  { code: '2701', name: '세종' },
  { code: '3100', name: '경기' },
  { code: '3201', name: '강원' },
  { code: '3300', name: '충북' },
  { code: '3400', name: '충남' },
  { code: '3500', name: '전북' },
  { code: '3600', name: '전남' },
  { code: '3700', name: '경북' },
  { code: '3800', name: '경남' },
  { code: '3911', name: '제주' },
];
