'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useData } from '@/lib/store/data';
import {
  BULK_FIELD_LABELS,
  buildColumns,
  parseTable,
  validateRows,
  type BulkColumn,
  type BulkField,
  type BulkParseResult,
  type BulkRowInput,
} from '@/lib/domain/bulkImport';
import { formatWon } from '@/lib/domain/money';

type Tab = 'paste' | 'file';

const SAMPLE = `재료명\t구매수량\t단위\t구매가격
양파\t10\tkg\t25000
대파\t5\tkg\t12000
고추장\t6.5\tkg\t30000`;

/**
 * 식재료·부자재를 한 번에 등록하는 화면.
 *
 * 1) 엑셀에서 복사한 내용을 그대로 붙여넣거나
 * 2) CSV / XLSX 파일을 올린 뒤
 * 열이 어떤 항목인지 맞추고, 미리보기에서 정상/오류/중복을 확인한 다음 등록한다.
 */
export function BulkImportModal({
  open,
  target,
  onClose,
  onSubmit,
}: {
  open: boolean;
  target: 'ingredient' | 'supply';
  onClose: () => void;
  onSubmit: (rows: BulkRowInput[]) => void;
}) {
  const { ingredients, supplies } = useData();
  const [tab, setTab] = useState<Tab>('paste');
  const [text, setText] = useState('');
  const [table, setTable] = useState<string[][] | null>(null);
  const [columns, setColumns] = useState<BulkColumn[]>([]);
  const [body, setBody] = useState<string[][]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingNames = useMemo(
    () => (target === 'ingredient' ? ingredients : supplies).map((item) => item.name),
    [target, ingredients, supplies],
  );

  const result: BulkParseResult | null = useMemo(() => {
    if (!table || columns.length === 0) return null;
    return validateRows(body, columns, existingNames);
  }, [table, body, columns, existingNames]);

  const label = target === 'ingredient' ? '재료' : '부자재';

  const applyTable = (parsed: string[][]) => {
    const built = buildColumns(parsed);
    setTable(parsed);
    setColumns(built.columns);
    setBody(built.body);
    setExcluded(new Set());
  };

  const reset = () => {
    setText('');
    setTable(null);
    setColumns([]);
    setBody([]);
    setFileName(null);
    setFileError(null);
    setExcluded(new Set());
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setLoading(true);
    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        // 엑셀 파일은 용량이 커서 필요할 때만 불러온다.
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const book = XLSX.read(buffer, { type: 'array' });
        const sheet = book.Sheets[book.SheetNames[0]];
        if (!sheet) throw new Error('시트를 찾을 수 없습니다.');
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
        const cleaned = rows
          .map((row) => row.map((cell) => String(cell ?? '').trim()))
          .filter((row) => row.some((cell) => cell.length > 0));
        if (cleaned.length === 0) throw new Error('내용이 비어 있습니다.');
        applyTable(cleaned);
      } else {
        const content = await file.text();
        const parsed = parseTable(content);
        if (parsed.length === 0) throw new Error('내용이 비어 있습니다.');
        applyTable(parsed);
      }
      setFileName(file.name);
    } catch (error) {
      setFileError(
        error instanceof Error
          ? `파일을 읽지 못했습니다: ${error.message}`
          : '파일을 읽지 못했습니다.',
      );
      setTable(null);
    } finally {
      setLoading(false);
    }
  };

  const setColumnField = (index: number, field: BulkField | null) => {
    setColumns((prev) =>
      prev.map((column, i) => {
        if (i === index) return { ...column, field };
        // 같은 항목이 두 열에 겹치지 않게 한다.
        if (field && column.field === field) return { ...column, field: null };
        return column;
      }),
    );
  };

  const selectableRows = result
    ? result.rows.filter((row) => row.status !== 'error' && !excluded.has(row.line))
    : [];

  const handleSubmit = () => {
    const values = selectableRows
      .map((row) => row.value)
      .filter((value): value is BulkRowInput => value !== null);
    if (values.length === 0) return;
    onSubmit(values);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      size="lg"
      onClose={() => {
        reset();
        onClose();
      }}
      title={`${label} 대량 등록`}
      description="엑셀에서 복사해 붙여넣거나 파일을 올리면 한 번에 등록할 수 있습니다."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={selectableRows.length === 0}>
            {selectableRows.length > 0 ? `${selectableRows.length}건 등록하기` : '등록하기'}
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-ink-100 p-1">
        {(['paste', 'file'] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`h-10 rounded-lg text-sm font-bold transition-colors ${
              tab === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            {value === 'paste' ? '붙여넣기' : '파일 올리기'}
          </button>
        ))}
      </div>

      {tab === 'paste' ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const parsed = parseTable(e.target.value);
              if (parsed.length > 0) applyTable(parsed);
              else setTable(null);
            }}
            rows={6}
            placeholder={SAMPLE}
            className="w-full rounded-xl border border-ink-200 bg-white p-3.5 font-mono text-sm text-ink-900 placeholder:text-ink-300 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-ink-500">
              엑셀에서 표를 복사해 그대로 붙여넣으세요. 첫 줄이 제목이면 자동으로 인식합니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setText(SAMPLE);
                applyTable(parseTable(SAMPLE));
              }}
              className="text-xs font-bold text-brand-600 underline"
            >
              예시 넣어보기
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="text-2xl">📄</span>
            <span className="mt-2 text-[15px] font-bold text-ink-800">
              {loading ? '읽는 중...' : fileName ? fileName : '파일 선택하기'}
            </span>
            <span className="mt-1 text-xs text-ink-500">CSV, XLSX 파일을 올릴 수 있습니다</span>
          </button>
          {fileError ? (
            <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {fileError}
            </p>
          ) : null}
        </div>
      )}

      {result ? (
        <>
          <div className="mt-6">
            <h3 className="text-sm font-bold text-ink-800">열 맞추기</h3>
            <p className="mt-1 text-xs text-ink-500">
              각 열이 어떤 항목인지 확인해주세요. 자동으로 맞춰두었지만 다르면 바꿀 수 있습니다.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {columns.map((column, index) => (
                <div key={`${column.header}-${index}`} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-sm font-semibold text-ink-600">
                    {column.header}
                  </span>
                  <SelectField
                    value={column.field ?? ''}
                    onChange={(e) =>
                      setColumnField(index, (e.target.value || null) as BulkField | null)
                    }
                    fieldClassName="flex-1"
                  >
                    <option value="">사용 안 함</option>
                    {(Object.keys(BULK_FIELD_LABELS) as BulkField[]).map((field) => (
                      <option key={field} value={field}>
                        {BULK_FIELD_LABELS[field]}
                      </option>
                    ))}
                  </SelectField>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-ink-800">미리보기</h3>
              <Badge tone="success">정상 {result.okCount}</Badge>
              {result.duplicateCount > 0 ? (
                <Badge tone="warning">중복 {result.duplicateCount}</Badge>
              ) : null}
              {result.errorCount > 0 ? <Badge tone="danger">오류 {result.errorCount}</Badge> : null}
            </div>

            <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {result.rows.map((row) => {
                const isError = row.status === 'error';
                const checked = !isError && !excluded.has(row.line);
                return (
                  <li
                    key={row.line}
                    className={`rounded-xl border px-3 py-2.5 ${
                      isError
                        ? 'border-red-200 bg-red-50/60'
                        : row.status === 'duplicate'
                          ? 'border-amber-200 bg-amber-50/60'
                          : 'border-ink-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isError}
                        onChange={(e) =>
                          setExcluded((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.delete(row.line);
                            else next.add(row.line);
                            return next;
                          })
                        }
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-brand-500 disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0 flex-1">
                        {row.value ? (
                          <p className="tnum text-sm font-semibold text-ink-900">
                            {row.value.name} · {row.value.quantity}
                            {row.value.unit} · {formatWon(row.value.price)}
                          </p>
                        ) : (
                          <p className="truncate text-sm font-semibold text-ink-500">
                            {row.raw.join(' / ') || '(빈 줄)'}
                          </p>
                        )}
                        {row.issues.length > 0 ? (
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {row.issues.map((issue) => (
                              <li
                                key={issue}
                                className={`text-xs ${isError ? 'text-red-600' : 'text-amber-700'}`}
                              >
                                {row.line}번째 줄 · {issue}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {result.errorCount > 0 ? (
              <p className="mt-2 text-xs text-ink-500">
                오류가 있는 줄은 등록되지 않습니다. 정상인 줄만 골라서 먼저 등록하셔도 됩니다.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
