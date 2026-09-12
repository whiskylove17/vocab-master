// Danh sách các chương mặc định ban đầu (Chỉ tạo 1 chương duy nhất theo yêu cầu)
const DEFAULT_CHAPTERS = [
  {
    id: "chap-btvn-09",
    name: "Chương: BTVN 09",
    description: "Bộ 46 từ vựng BTVN 09: Công sở, lịch trình, hợp đồng và quản lý",
    color: "#ec4899"
  }
];

// Dữ liệu từ vựng mẫu ban đầu đa dạng theo chương & chủ đề
const BTVN_09_VOCABULARY = [
  {
    "id": "btvn09-1",
    "chapterId": "chap-btvn-09",
    "word": "error code",
    "phonetic": "/ˈerər koʊd/",
    "partOfSpeech": "word",
    "meaning": "mã lỗi",
    "synonyms": [
      "mã lỗi"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-2",
    "chapterId": "chap-btvn-09",
    "word": "road closure",
    "phonetic": "/roʊd ˈkloʊʒər/",
    "partOfSpeech": "word",
    "meaning": "việc đóng đường",
    "synonyms": [
      "việc đóng đường"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-3",
    "chapterId": "chap-btvn-09",
    "word": "commercial",
    "phonetic": "/kəˈmɜːrʃl/",
    "partOfSpeech": "word",
    "meaning": "thuộc thương mại; quảng cáo",
    "synonyms": [
      "thuộc thương mại",
      "quảng cáo"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-4",
    "chapterId": "chap-btvn-09",
    "word": "notify",
    "phonetic": "/ˈnoʊtɪfaɪ/",
    "partOfSpeech": "word",
    "meaning": "thông báo",
    "synonyms": [
      "thông báo"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-5",
    "chapterId": "chap-btvn-09",
    "word": "meet a deadline",
    "phonetic": "/miːt ə ˈdedlaɪn/",
    "partOfSpeech": "word",
    "meaning": "hoàn thành đúng hạn",
    "synonyms": [
      "hoàn thành đúng hạn"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-6",
    "chapterId": "chap-btvn-09",
    "word": "business trip",
    "phonetic": "/ˈbɪznəs trɪp/",
    "partOfSpeech": "word",
    "meaning": "chuyến công tác",
    "synonyms": [
      "chuyến công tác"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-7",
    "chapterId": "chap-btvn-09",
    "word": "corporate",
    "phonetic": "/ˈkɔːrpərət/",
    "partOfSpeech": "word",
    "meaning": "thuộc công ty, tập đoàn",
    "synonyms": [
      "thuộc công ty",
      "tập đoàn"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-8",
    "chapterId": "chap-btvn-09",
    "word": "policy",
    "phonetic": "/ˈpɑːləsi/",
    "partOfSpeech": "word",
    "meaning": "chính sách; quy định",
    "synonyms": [
      "chính sách",
      "quy định"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-9",
    "chapterId": "chap-btvn-09",
    "word": "contract",
    "phonetic": "/ˈkɑːntrækt/",
    "partOfSpeech": "word",
    "meaning": "hợp đồng",
    "synonyms": [
      "hợp đồng"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-10",
    "chapterId": "chap-btvn-09",
    "word": "renew",
    "phonetic": "/rɪˈnuː/",
    "partOfSpeech": "word",
    "meaning": "gia hạn; làm mới",
    "synonyms": [
      "gia hạn",
      "làm mới"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-11",
    "chapterId": "chap-btvn-09",
    "word": "colleague",
    "phonetic": "/ˈkɑːliːɡ/",
    "partOfSpeech": "word",
    "meaning": "đồng nghiệp",
    "synonyms": [
      "đồng nghiệp"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-12",
    "chapterId": "chap-btvn-09",
    "word": "conduct",
    "phonetic": "/kənˈdʌkt/",
    "partOfSpeech": "word",
    "meaning": "tiến hành, thực hiện",
    "synonyms": [
      "tiến hành",
      "thực hiện"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-13",
    "chapterId": "chap-btvn-09",
    "word": "calculate",
    "phonetic": "/ˈkælkjuleɪt/",
    "partOfSpeech": "word",
    "meaning": "tính toán",
    "synonyms": [
      "tính toán"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-14",
    "chapterId": "chap-btvn-09",
    "word": "travel itinerary",
    "phonetic": "/ˈtrævl aɪˈtɪnəreri/",
    "partOfSpeech": "word",
    "meaning": "lịch trình chuyến đi",
    "synonyms": [
      "lịch trình chuyến đi"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-15",
    "chapterId": "chap-btvn-09",
    "word": "invitation",
    "phonetic": "/ˌɪnvɪˈteɪʃən/",
    "partOfSpeech": "word",
    "meaning": "lời mời",
    "synonyms": [
      "lời mời"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-16",
    "chapterId": "chap-btvn-09",
    "word": "receive",
    "phonetic": "/rɪˈsiːv/",
    "partOfSpeech": "word",
    "meaning": "nhận",
    "synonyms": [
      "nhận"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-17",
    "chapterId": "chap-btvn-09",
    "word": "detail",
    "phonetic": "/ˈdiːteɪl/",
    "partOfSpeech": "word",
    "meaning": "chi tiết",
    "synonyms": [
      "chi tiết"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-18",
    "chapterId": "chap-btvn-09",
    "word": "assignment",
    "phonetic": "/əˈsaɪnmənt/",
    "partOfSpeech": "word",
    "meaning": "nhiệm vụ; bài tập được giao",
    "synonyms": [
      "nhiệm vụ",
      "bài tập được giao"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-19",
    "chapterId": "chap-btvn-09",
    "word": "reimbursement",
    "phonetic": "/ˌriːɪmˈbɜːrsmənt/",
    "partOfSpeech": "word",
    "meaning": "khoản hoàn trả chi phí",
    "synonyms": [
      "khoản hoàn trả chi phí"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-20",
    "chapterId": "chap-btvn-09",
    "word": "process",
    "phonetic": "/ˈprɑːses/",
    "partOfSpeech": "word",
    "meaning": "quy trình; xử lý",
    "synonyms": [
      "quy trình",
      "xử lý"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-21",
    "chapterId": "chap-btvn-09",
    "word": "consult",
    "phonetic": "/kənˈsʌlt/",
    "partOfSpeech": "word",
    "meaning": "tham khảo; tư vấn",
    "synonyms": [
      "tham khảo",
      "tư vấn"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-22",
    "chapterId": "chap-btvn-09",
    "word": "malfunction",
    "phonetic": "/ˌmælˈfʌŋkʃən/",
    "partOfSpeech": "word",
    "meaning": "sự trục trặc; hoạt động không đúng",
    "synonyms": [
      "sự trục trặc",
      "hoạt động không đúng"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-23",
    "chapterId": "chap-btvn-09",
    "word": "revise",
    "phonetic": "/rɪˈvaɪz/",
    "partOfSpeech": "word",
    "meaning": "sửa đổi; chỉnh sửa",
    "synonyms": [
      "sửa đổi",
      "chỉnh sửa"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-24",
    "chapterId": "chap-btvn-09",
    "word": "deadline extension",
    "phonetic": "/ˈdedlaɪn ɪkˈstenʃən/",
    "partOfSpeech": "word",
    "meaning": "gia hạn thời hạn",
    "synonyms": [
      "gia hạn thời hạn"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-25",
    "chapterId": "chap-btvn-09",
    "word": "inconsistent",
    "phonetic": "/ˌɪnkənˈsɪstənt/",
    "partOfSpeech": "word",
    "meaning": "không nhất quán",
    "synonyms": [
      "không nhất quán"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-26",
    "chapterId": "chap-btvn-09",
    "word": "increase",
    "phonetic": "/ɪnˈkriːs/",
    "partOfSpeech": "word",
    "meaning": "tăng; sự tăng lên",
    "synonyms": [
      "tăng",
      "sự tăng lên"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-27",
    "chapterId": "chap-btvn-09",
    "word": "profit",
    "phonetic": "/ˈprɑːfɪt/",
    "partOfSpeech": "word",
    "meaning": "lợi nhuận",
    "synonyms": [
      "lợi nhuận"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-28",
    "chapterId": "chap-btvn-09",
    "word": "council",
    "phonetic": "/ˈkaʊnsl/",
    "partOfSpeech": "word",
    "meaning": "hội đồng",
    "synonyms": [
      "hội đồng"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-29",
    "chapterId": "chap-btvn-09",
    "word": "safety inspection",
    "phonetic": "/ˈseɪfti ɪnˈspekʃən/",
    "partOfSpeech": "word",
    "meaning": "kiểm tra an toàn",
    "synonyms": [
      "kiểm tra an toàn"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-30",
    "chapterId": "chap-btvn-09",
    "word": "store clerk",
    "phonetic": "/stɔːr klɜːrk/",
    "partOfSpeech": "word",
    "meaning": "nhân viên cửa hàng",
    "synonyms": [
      "nhân viên cửa hàng"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-31",
    "chapterId": "chap-btvn-09",
    "word": "meeting minutes",
    "phonetic": "/ˈmiːtɪŋ ˈmɪnɪts/",
    "partOfSpeech": "word",
    "meaning": "biên bản cuộc họp",
    "synonyms": [
      "biên bản cuộc họp"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-32",
    "chapterId": "chap-btvn-09",
    "word": "travel expense",
    "phonetic": "/ˈtrævl ɪkˈspens/",
    "partOfSpeech": "word",
    "meaning": "chi phí đi lại/công tác",
    "synonyms": [
      "chi phí đi lại/công tác"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-33",
    "chapterId": "chap-btvn-09",
    "word": "procedure",
    "phonetic": "/prəˈsiːdʒər/",
    "partOfSpeech": "word",
    "meaning": "quy trình; thủ tục",
    "synonyms": [
      "quy trình",
      "thủ tục"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-34",
    "chapterId": "chap-btvn-09",
    "word": "activity",
    "phonetic": "/ækˈtɪvəti/",
    "partOfSpeech": "word",
    "meaning": "hoạt động",
    "synonyms": [
      "hoạt động"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-35",
    "chapterId": "chap-btvn-09",
    "word": "sum up",
    "phonetic": "/sʌm ʌp/",
    "partOfSpeech": "word",
    "meaning": "tóm tắt",
    "synonyms": [
      "tóm tắt"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-36",
    "chapterId": "chap-btvn-09",
    "word": "valuable member",
    "phonetic": "/ˈvæljuəbl ˈmembər/",
    "partOfSpeech": "word",
    "meaning": "thành viên có giá trị/quan trọng",
    "synonyms": [
      "thành viên có giá trị/quan trọng"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-37",
    "chapterId": "chap-btvn-09",
    "word": "outstanding",
    "phonetic": "/aʊtˈstændɪŋ/",
    "partOfSpeech": "word",
    "meaning": "xuất sắc; nổi bật; chưa thanh toán",
    "synonyms": [
      "xuất sắc",
      "nổi bật",
      "chưa thanh toán"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-38",
    "chapterId": "chap-btvn-09",
    "word": "decision",
    "phonetic": "/dɪˈsɪʒn/",
    "partOfSpeech": "word",
    "meaning": "quyết định",
    "synonyms": [
      "quyết định"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-39",
    "chapterId": "chap-btvn-09",
    "word": "badge",
    "phonetic": "/bædʒ/",
    "partOfSpeech": "word",
    "meaning": "thẻ; huy hiệu",
    "synonyms": [
      "thẻ",
      "huy hiệu"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-40",
    "chapterId": "chap-btvn-09",
    "word": "new hire",
    "phonetic": "/nuː haɪər/",
    "partOfSpeech": "word",
    "meaning": "nhân viên mới tuyển",
    "synonyms": [
      "nhân viên mới tuyển"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-41",
    "chapterId": "chap-btvn-09",
    "word": "position",
    "phonetic": "/pəˈzɪʃn/",
    "partOfSpeech": "word",
    "meaning": "vị trí; chức vụ",
    "synonyms": [
      "vị trí",
      "chức vụ"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-42",
    "chapterId": "chap-btvn-09",
    "word": "take inventory",
    "phonetic": "/teɪk ˈɪnvəntɔːri/",
    "partOfSpeech": "word",
    "meaning": "kiểm kê hàng tồn kho",
    "synonyms": [
      "kiểm kê hàng tồn kho"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-43",
    "chapterId": "chap-btvn-09",
    "word": "cardboard box",
    "phonetic": "/ˈkɑːrdbɔːrd bɑːks/",
    "partOfSpeech": "word",
    "meaning": "thùng carton",
    "synonyms": [
      "thùng carton"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-44",
    "chapterId": "chap-btvn-09",
    "word": "digital camera",
    "phonetic": "/ˈdɪdʒɪtl ˈkæmərə/",
    "partOfSpeech": "word",
    "meaning": "máy ảnh kỹ thuật số",
    "synonyms": [
      "máy ảnh kỹ thuật số"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-45",
    "chapterId": "chap-btvn-09",
    "word": "battery",
    "phonetic": "/ˈbætəri/",
    "partOfSpeech": "word",
    "meaning": "pin; ắc quy",
    "synonyms": [
      "pin",
      "ắc quy"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  },
  {
    "id": "btvn09-46",
    "chapterId": "chap-btvn-09",
    "word": "personal belonging",
    "phonetic": "/ˈpɜːrsənl bɪˈlɔːŋɪŋ/",
    "partOfSpeech": "word",
    "meaning": "đồ dùng, tài sản cá nhân",
    "synonyms": [
      "đồ dùng",
      "tài sản cá nhân"
    ],
    "example": "",
    "exampleMeaning": "",
    "topic": "work",
    "mastered": false,
    "correctCount": 0,
    "incorrectCount": 0
  }
];

const DEFAULT_VOCABULARY = [
  ...BTVN_09_VOCABULARY
];


const TOPIC_LABELS = {
  all: "Tất cả chủ đề",
  daily: "Cuộc sống & Giao tiếp",
  work: "Công việc & Kinh doanh",
  travel: "Du lịch & Khám phá",
  academic: "Học thuật & IELTS",
  tech: "Công nghệ & AI"
};

const PART_OF_SPEECH_LABELS = {
  noun: "Danh từ (n)",
  verb: "Động từ (v)",
  adj: "Tính từ (adj)",
  adv: "Trạng từ (adv)",
  phrase: "Cụm từ (phrase)",
  idiom: "Thành ngữ (idiom)"
};
