export interface OnlineStore {
  id: string;
  name: string;
  /** Tailwind class string for chip styling. */
  chipClass: string;
  buildSearchUrl: (query: string) => string;
}

const enc = (s: string) => encodeURIComponent(s.trim());

export const ONLINE_STORES: OnlineStore[] = [
  {
    id: 'melonbooks',
    name: 'メロンブックス',
    chipClass: 'bg-pink-500/10 text-pink-300 border-pink-500/30 hover:bg-pink-500/20',
    buildSearchUrl: q => `https://www.melonbooks.co.jp/search/search.php?name=${enc(q)}`,
  },
  {
    id: 'booth',
    name: 'BOOTH',
    chipClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20',
    buildSearchUrl: q => `https://booth.pm/ja/search/${enc(q)}`,
  },
  {
    id: 'toranoana',
    name: 'コミックとらのあな',
    chipClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
    buildSearchUrl: q => `https://ec.toranoana.jp/tora_r/ec/app/catalog/list?searchWord=${enc(q)}`,
  },
  {
    id: 'fromage',
    name: 'フロマージュ',
    chipClass: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/20',
    buildSearchUrl: q => `https://www.fromagebooks.jp/?s=${enc(q)}`,
  },
  {
    id: 'kbooks',
    name: 'K-Books',
    chipClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
    buildSearchUrl: q => `https://k-books.co.jp/item/list?keyword=${enc(q)}`,
  },
  {
    id: 'mandarake',
    name: 'まんだらけ',
    chipClass: 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20',
    buildSearchUrl: q => `https://order.mandarake.co.jp/order/listPage/list?keyword=${enc(q)}`,
  },
  {
    id: 'dlsite',
    name: 'DLsite',
    chipClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20',
    buildSearchUrl: q => `https://www.dlsite.com/maniax/fsr/=/keyword/${enc(q)}`,
  },
  {
    id: 'surugaya',
    name: '駿河屋',
    chipClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
    buildSearchUrl: q => `https://www.suruga-ya.jp/search?search_word=${enc(q)}`,
  },
];
