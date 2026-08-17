/**
 * 서버가 켜질 때 한 번 실행된다.
 *
 * 시세 화면은 품목마다 공공 API 를 한 번씩 불러야 해서 처음 모으는 데 10초 이상 걸린다.
 * 그 시간을 사장님이 기다리지 않도록, 서버가 뜬 직후에 미리 한 번 채워 둔다.
 *
 * 주의: register() 는 "서버가 요청을 받기 전에 완료되어야" 하므로 절대 await 하지 않는다.
 * 여기서 기다리면 배포마다 서버가 그만큼 늦게 뜬다. 그래서 결과를 기다리지 않고 던져둔다.
 *
 * 함수를 직접 부르지 않고 자기 서버로 HTTP 요청을 보내는 이유:
 * Next 의 fetch 캐시는 요청 처리 문맥 안에서만 동작한다. 라우트를 거쳐야 캐시가 제대로
 * 채워지므로, 평소 사장님이 보는 것과 똑같은 경로로 한 번 훑는다.
 */
export function register(): void {
  // 브라우저·엣지 런타임에서는 하지 않는다.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // 인증키가 없으면 시세 기능 자체가 꺼져 있으므로 할 일이 없다.
  if (!(process.env.DATA_GO_KR_SERVICE_KEY ?? '').trim()) return;

  const port = process.env.PORT ?? '3000';
  const base = `http://127.0.0.1:${port}`;
  const groups = ['채소', '과일', '곡물', '축산', '수산', '버섯·견과', '가공품'];

  // 서버가 실제로 들을 준비가 될 때까지 잠깐 기다린 뒤 시작한다.
  setTimeout(() => {
    void (async () => {
      for (const group of groups) {
        try {
          await fetch(`${base}/api/market-prices?group=${encodeURIComponent(group)}&channel=retail`);
        } catch {
          // 미리 채우기는 실패해도 그냥 넘어간다. 사장님이 들어올 때 정상적으로 조회된다.
        }
      }
    })();
  }, 3000);
}
