import { ArrowUpRight } from 'lucide-react';

export function LiveProjectButton() {
  return (
    <button
      className="flex items-center gap-2 rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base hover:bg-[#D7E2EA]/10 transition-colors"
    >
      Live Project
      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>
  );
}
