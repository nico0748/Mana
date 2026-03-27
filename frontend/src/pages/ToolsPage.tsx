import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Shield } from 'lucide-react';

const TERMS_TEXT = `同人++ 利用規約

最終更新日: 2025年1月1日

第1条（適用）
本規約は、同人++（以下「本サービス」）の利用条件を定めるものです。登録ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。

第2条（利用登録）
登録希望者が本サービスの定める方法によって利用登録を申請し、当方がこれを承認することによって、利用登録が完了するものとします。

第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
・法令または公序良俗に違反する行為
・犯罪行為に関連する行為
・本サービスのサーバーまたはネットワークに過度な負荷をかける行為
・他のユーザーに関する個人情報等を収集または蓄積する行為
・不正アクセスをし、またはこれを試みる行為
・他のユーザーに成りすます行為
・本サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
・その他、当方が不適切と判断する行為

第4条（本サービスの提供の停止等）
当方は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
・本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
・地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
・その他、当方が本サービスの提供が困難と判断した場合

第5条（免責事項）
当方は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。

第6条（プライバシー）
本サービスはユーザーのデータを適切に管理します。詳細はプライバシーポリシーをご確認ください。

第7条（規約の変更）
当方は必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。

以上`;

const PRIVACY_TEXT = `同人++ プライバシーポリシー

最終更新日: 2025年1月1日

第1条（個人情報の収集）
本サービスでは、利用登録の際にメールアドレスを収集します。また、Firebase Authentication を通じてアカウント情報を管理します。

第2条（個人情報の利用目的）
収集した個人情報は、以下の目的で利用します。
・本サービスの提供・運営のため
・ユーザーからのお問い合わせに回答するため
・不正行為の防止および安全確保のため

第3条（個人情報の第三者提供）
当方は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。
・法令に基づく場合
・人の生命・身体または財産の保護のために必要がある場合

第4条（データの保存）
ユーザーが入力した蔵書データ・買い物リストなどのコンテンツはサーバーに保存されます。アカウント削除時にはこれらのデータも削除されます。

第5条（セキュリティ）
当方は、個人情報の漏洩、滅失または毀損の防止その他個人情報の安全管理のために必要かつ適切な措置を講じます。

第6条（プライバシーポリシーの変更）
当方は、必要に応じてプライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本サービス上に表示した時点で効力を生じるものとします。

第7条（お問い合わせ）
本ポリシーに関するお問い合わせは、本サービス内のお問い合わせ窓口よりご連絡ください。

以上`;

interface LegalSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string;
}

const LegalSection: React.FC<LegalSectionProps> = ({ title, icon, content }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-zinc-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-96 overflow-y-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
};

const ToolsPage: React.FC = () => {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

      {/* 法的情報 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">法的情報</h2>
        <LegalSection
          title="利用規約"
          icon={<FileText className="w-4 h-4 text-zinc-500" />}
          content={TERMS_TEXT}
        />
        <LegalSection
          title="プライバシーポリシー"
          icon={<Shield className="w-4 h-4 text-zinc-500" />}
          content={PRIVACY_TEXT}
        />
      </section>

      {/* App info */}
      <section className="text-center text-zinc-600 text-xs space-y-1 pt-2">
        <p className="font-semibold text-zinc-500">同人++</p>
        <p>同人活動管理アプリ</p>
        <p className="text-zinc-700">データはすべてこのデバイスに保存されます</p>
      </section>
    </div>
  );
};

export default ToolsPage;
