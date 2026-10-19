import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8814759294:AAGq_7AgLzfhfvP26GlDVIW-K78EzMXNs24';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPER_ADMIN_ID = '5139629652';
const WEBAPP_URL = 'https://quanly-thetaxi.vercel.app';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zcklztoovbtukrntlibe.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1tM15vXnXZzu0zS5XBscVg_teKBHbjx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('sendTelegramMessage error:', err);
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    console.error('answerCallbackQuery error:', err);
  }
}

async function editMessageText(chatId: string | number, messageId: number, text: string, replyMarkup?: any) {
  try {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error('editMessageText error:', err);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', bot: 'ADM_thetaxi_bot' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;
  if (!update) {
    return res.status(400).json({ error: 'Empty body' });
  }

  try {
    // 1. Xử lý tin nhắn văn bản (ví dụ: /start)
    if (update.message) {
      const msg = update.message;
      const text = msg.text || '';
      const chatId = msg.chat.id;
      const fromUser = msg.from;
      const fromIdStr = String(fromUser?.id || chatId);

      if (text.startsWith('/start')) {
        // Kiểm tra xem người dùng đã có trong Database chưa
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', fromIdStr)
          .maybeSingle();

        // TRƯỜNG HỢP 1: Là Super Admin (Van Cao hoặc role admin_hr)
        if (fromIdStr === SUPER_ADMIN_ID || dbUser?.role === 'admin_hr' || dbUser?.role === 'admin') {
          await sendTelegramMessage(
            chatId,
            `Xin chào Quản trị viên <b>${fromUser?.first_name || 'Van Cao'}</b>! 🛡️\n\nBạn đang quản lý hệ thống <b>TaxiCard (Quản lý Thẻ Taxi Doanh nghiệp)</b>.\nTài khoản của bạn có quyền Super Admin: Cấp thẻ, xét duyệt đơn mượn thẻ, duyệt thành viên mới và theo dõi chi phí.\n\n👇 Bấm nút bên dưới để mở Bảng điều khiển Quản trị:`,
            {
              inline_keyboard: [
                [
                  {
                    text: '🚖 Mở Bảng điều khiển Quản trị',
                    web_app: { url: WEBAPP_URL },
                  },
                ],
              ],
            }
          );
        }
        // TRƯỜNG HỢP 2: Nhân sự đã được Admin phê duyệt (role === 'employee' hoặc 'leader')
        else if (dbUser && (dbUser.role === 'employee' || dbUser.role === 'leader')) {
          await sendTelegramMessage(
            chatId,
            `Xin chào <b>${dbUser.name}</b>! 👋\n\nTài khoản của bạn đã được kích hoạt trên hệ thống <b>TaxiCard</b>.\n• Mã nhân sự: <code>${dbUser.code}</code>\n• Bộ phận: <b>${dbUser.department || 'Nội bộ'}</b>\n\n👇 Bấm nút bên dưới để mở ứng dụng và gửi yêu cầu mượn thẻ:`,
            {
              inline_keyboard: [
                [
                  {
                    text: '🚖 Đăng ký mượn thẻ Taxi',
                    web_app: { url: WEBAPP_URL },
                  },
                ],
              ],
            }
          );
        }
        // TRƯỜNG HỢP 3: Người dùng mới chưa đăng ký hoặc đang chờ duyệt (role === 'pending')
        else {
          await sendTelegramMessage(
            chatId,
            `Xin chào <b>${fromUser?.first_name || 'bạn'}</b>! 👋\n\nChào mừng bạn đến với <b>Hệ thống Quản lý Thẻ Taxi Doanh nghiệp (TaxiCard)</b>.\n\n⚠️ <i>Bạn chưa được cấp phép vào hệ thống này.</i>\nĐể sử dụng thẻ taxi của công ty, bạn vui lòng hoàn thành đăng ký thông tin nhân sự:\n• <b>Mã nhân sự</b> (VD: NV-1024)\n• <b>Họ và tên</b>\n• <b>Bộ phận / Phòng ban</b>\n• <b>Họ và tên Leader trực tiếp</b>\n\n👇 Bấm nút bên dưới để mở biểu mẫu và gửi Admin phê duyệt:`,
            {
              inline_keyboard: [
                [
                  {
                    text: '📝 Điền thông tin đăng ký nhân sự',
                    web_app: { url: WEBAPP_URL },
                  },
                ],
              ],
            }
          );
        }
      }
    }

    // 2. Xử lý Callback Query khi Admin bấm nút Duyệt / Từ chối trực tiếp trên Telegram
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const adminFromId = String(cb.from?.id);

      // Kiểm tra quyền: Super Admin hoặc bất kỳ ai có role admin_hr / admin
      const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', adminFromId)
        .in('role', ['admin_hr', 'admin'])
        .maybeSingle();

      const isAuthorizedAdmin = adminFromId === SUPER_ADMIN_ID || Boolean(adminUser);
      if (!isAuthorizedAdmin) {
        await answerCallbackQuery(cb.id, '⛔ Bạn không có quyền quản trị viên!');
        return res.status(200).json({ ok: true });
      }

      const approverName = adminUser?.name || (cb.from?.first_name ? `${cb.from.first_name} ${cb.from.last_name || ''}`.trim() : 'Super Admin');

      if (data.startsWith('approve_user_')) {
        let grantedRole = 'employee';
        let isLeader = false;
        let userId = '';

        if (data.startsWith('approve_user_leader_')) {
          grantedRole = 'leader';
          isLeader = true;
          userId = data.replace('approve_user_leader_', '');
        } else if (data.startsWith('approve_user_employee_')) {
          grantedRole = 'employee';
          isLeader = false;
          userId = data.replace('approve_user_employee_', '');
        } else {
          userId = data.replace('approve_user_', '');
        }

        const { data: targetUser } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

        if (targetUser) {
          // Kiểm tra xem đã có ai duyệt trước chưa để tránh trùng lặp
          if (targetUser.role !== 'pending' && targetUser.role !== 'unregistered') {
            await answerCallbackQuery(cb.id, `⚠️ Hồ sơ này đã được xử lý trước đó với vai trò: ${targetUser.role}!`);
            if (cb.message) {
              await editMessageText(
                cb.message.chat.id,
                cb.message.message_id,
                `ℹ️ <b>HỒ SƠ ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ!</b>\n\n• Thành viên: <b>${targetUser.name}</b> (<code>${targetUser.code}</code>)\n• Trạng thái hiện tại: <b>${targetUser.role}</b>`
              );
            }
            return res.status(200).json({ ok: true });
          }

          await supabase.from('users').update({ role: grantedRole, is_leader: isLeader }).eq('id', userId);
          const roleLabel = grantedRole === 'leader' ? 'Leader duyệt đơn' : 'Nhân sự';
          await answerCallbackQuery(cb.id, `✅ Đã phê duyệt ${targetUser.name} với vai trò ${roleLabel}!`);

          if (cb.message) {
            await editMessageText(
              cb.message.chat.id,
              cb.message.message_id,
              `✅ <b>ĐÃ PHÊ DUYỆT THÀNH VIÊN THÀNH CÔNG!</b>\n\n• Họ và tên: <b>${targetUser.name}</b>\n• Mã nhân sự: <code>${targetUser.code}</code>\n• Bộ phận: <b>${targetUser.department}</b>\n• Vai trò cấp: <b>${roleLabel}</b>\n• Người duyệt: <b>${approverName}</b>\n• Trạng thái: <font color="#10b981">Đã cấp quyền hệ thống</font>`
            );
          }

          // Thông báo cho tất cả các Admin/HR còn lại biết Admin này đã duyệt
          try {
            const { data: otherAdmins } = await supabase
              .from('users')
              .select('telegram_id, name')
              .in('role', ['admin_hr', 'admin'])
              .not('telegram_id', 'is', null);

            const allAdminIds = new Set([SUPER_ADMIN_ID, ...(otherAdmins || []).map((a) => String(a.telegram_id))]);
            allAdminIds.delete(adminFromId);

            for (const otherAdminId of Array.from(allAdminIds)) {
              if (otherAdminId && otherAdminId.trim()) {
                await sendTelegramMessage(
                  otherAdminId,
                  `ℹ️ <b>THÔNG BÁO DUYỆT THÀNH VIÊN</b>\n\n• Nhân sự: <b>${targetUser.name}</b> (Mã: <code>${targetUser.code}</code>)\n• Đã được duyệt bởi Admin: <b>${approverName}</b>\n• Vai trò được cấp: <b>${roleLabel}</b>`
                ).catch(() => {});
              }
            }
          } catch (e) {
            console.warn('Error broadcasting approval to other admins:', e);
          }

          // Gửi thông báo trực tiếp cho nhân viên vừa được duyệt nếu có telegram_id
          if (targetUser.telegram_id) {
            await sendTelegramMessage(
              targetUser.telegram_id,
              `🎉 <b>Chúc mừng bạn ${targetUser.name}!</b>\n\nTài khoản của bạn đã được Admin <b>${approverName}</b> phê duyệt với vai trò: <b>${roleLabel}</b>.\n\n👇 Bấm nút bên dưới để mở ứng dụng:`,
              {
                inline_keyboard: [
                  [
                    {
                      text: '🚖 Mở TaxiCard Mini App',
                      web_app: { url: WEBAPP_URL },
                    },
                  ],
                ],
              }
            );
          }
        } else {
          await answerCallbackQuery(cb.id, 'Không tìm thấy hồ sơ nhân sự!');
        }
      } else if (data.startsWith('reject_user_')) {
        const userId = data.replace('reject_user_', '');
        const { data: targetUser } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

        if (targetUser) {
          if (targetUser.role !== 'pending' && targetUser.role !== 'unregistered') {
            await answerCallbackQuery(cb.id, `⚠️ Hồ sơ này đã được xử lý trước đó!`);
            return res.status(200).json({ ok: true });
          }

          await supabase.from('users').update({ role: 'rejected' }).eq('id', userId);
          await answerCallbackQuery(cb.id, `❌ Đã từ chối nhân sự ${targetUser.name}!`);

          if (cb.message) {
            await editMessageText(
              cb.message.chat.id,
              cb.message.message_id,
              `❌ <b>ĐÃ TỪ CHỐI THÀNH VIÊN!</b>\n\n• Họ và tên: <b>${targetUser.name}</b>\n• Mã nhân sự: <code>${targetUser.code}</code>\n• Người xử lý: <b>${approverName}</b>\n• Trạng thái: <font color="#ef4444">Từ chối cấp quyền</font>`
            );
          }

          // Thông báo cho các Admin/HR còn lại biết
          try {
            const { data: otherAdmins } = await supabase
              .from('users')
              .select('telegram_id, name')
              .in('role', ['admin_hr', 'admin'])
              .not('telegram_id', 'is', null);

            const allAdminIds = new Set([SUPER_ADMIN_ID, ...(otherAdmins || []).map((a) => String(a.telegram_id))]);
            allAdminIds.delete(adminFromId);

            for (const otherAdminId of Array.from(allAdminIds)) {
              if (otherAdminId && otherAdminId.trim()) {
                await sendTelegramMessage(
                  otherAdminId,
                  `ℹ️ <b>THÔNG BÁO TỪ CHỐI THÀNH VIÊN</b>\n\n• Nhân sự: <b>${targetUser.name}</b> (Mã: <code>${targetUser.code}</code>)\n• Đã bị từ chối bởi Admin: <b>${approverName}</b>.`
                ).catch(() => {});
              }
            }
          } catch (e) {
            console.warn('Error broadcasting rejection to other admins:', e);
          }

          if (targetUser.telegram_id) {
            await sendTelegramMessage(
              targetUser.telegram_id,
              `⚠️ Yêu cầu đăng ký tài khoản TaxiCard của bạn đã bị từ chối bởi Admin <b>${approverName}</b>.\nVui lòng liên hệ ban quản trị nếu có thắc mắc.`
            );
          }
        } else {
          await answerCallbackQuery(cb.id, 'Không tìm thấy hồ sơ nhân sự!');
        }
      } else if (data.startsWith('approve_req_')) {
        const reqId = data.replace('approve_req_', '');
        const { data: targetReq } = await supabase.from('requests').select('*').eq('id', reqId).maybeSingle();

        if (!targetReq) {
          await answerCallbackQuery(cb.id, '❌ Không tìm thấy yêu cầu mượn thẻ!');
          return res.status(200).json({ ok: true });
        }

        // Kiểm tra xem yêu cầu đã được xử lý chưa (không còn pending_admin / pending_leader)
        if (targetReq.status !== 'pending_admin' && targetReq.status !== 'pending_leader') {
          await answerCallbackQuery(cb.id, `⚠️ Yêu cầu ${reqId} đã được xử lý trước đó với trạng thái: ${targetReq.status}!`);
          if (cb.message) {
            await editMessageText(
              cb.message.chat.id,
              cb.message.message_id,
              `ℹ️ <b>YÊU CẦU ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ!</b>\n\n• Mã yêu cầu: <code>${reqId}</code>\n• Người mượn: <b>${targetReq.employee_name}</b> (<code>${targetReq.employee_code}</code>)\n• Trạng thái hiện tại: <b>${targetReq.status}</b>\n• Người xử lý: <b>${targetReq.admin_approver_name || 'Admin'}</b>`
            );
          }
          return res.status(200).json({ ok: true });
        }

        const now = new Date().toISOString();

        // Tìm thẻ đang available trong kho
        const { data: availableCards } = await supabase
          .from('cards')
          .select('*')
          .eq('status', 'available')
          .order('code', { ascending: true })
          .limit(1);

        const availableCard = availableCards?.[0];

        if (availableCard) {
          // 1. Cập nhật thẻ sang reserved
          await supabase.from('cards').update({
            status: 'reserved',
            current_request_id: reqId,
            assigned_to_name: targetReq.employee_name,
            assigned_to_code: targetReq.employee_code,
          }).eq('id', availableCard.id);

          // 2. Cập nhật yêu cầu sang pending_handover
          await supabase.from('requests').update({
            admin_approval_status: 'approved',
            admin_approval_comment: 'Admin đã duyệt cấp thẻ qua Telegram Bot',
            admin_approved_at: now,
            admin_approver_name: approverName,
            is_waitlisted: false,
            reserved_card_code: availableCard.code,
            handover_ready_at: now,
            status: 'pending_handover',
          }).eq('id', reqId);

          await answerCallbackQuery(cb.id, `✅ Đã duyệt cấp thẻ ${availableCard.code} cho ${targetReq.employee_name}!`);

          if (cb.message) {
            await editMessageText(
              cb.message.chat.id,
              cb.message.message_id,
              `✅ <b>ĐÃ DUYỆT CẤP THẺ THÀNH CÔNG!</b>\n\n• Mã yêu cầu: <code>${reqId}</code>\n• Người mượn: <b>${targetReq.employee_name}</b> (<code>${targetReq.employee_code}</code>)\n• Thẻ giữ dự kiến: <b>${availableCard.code}</b>\n• Người duyệt: <b>${approverName}</b>\n• Trạng thái: <font color="#10b981">Chờ bàn giao thẻ tại quầy</font>`
            );
          }

          // 3. Thông báo cho các Admin/HR còn lại biết
          try {
            const { data: otherAdmins } = await supabase
              .from('users')
              .select('telegram_id, name')
              .in('role', ['admin_hr', 'admin'])
              .not('telegram_id', 'is', null);

            const allAdminIds = new Set([SUPER_ADMIN_ID, ...(otherAdmins || []).map((a) => String(a.telegram_id))]);
            allAdminIds.delete(adminFromId);

            for (const otherAdminId of Array.from(allAdminIds)) {
              if (otherAdminId && otherAdminId.trim()) {
                await sendTelegramMessage(
                  otherAdminId,
                  `ℹ️ <b>THÔNG BÁO DUYỆT CẤP THẺ TAXI</b>\n\n• Mã yêu cầu: <code>${reqId}</code> (Nhân sự: <b>${targetReq.employee_name}</b>)\n• Đã được duyệt bởi Admin: <b>${approverName}</b>\n• Thẻ giữ dự kiến: <b>${availableCard.code}</b>\n• Trạng thái: <i>Chờ bàn giao thẻ tại quầy</i>`
                ).catch(() => {});
              }
            }
          } catch (e) {
            console.warn('Error broadcasting req approval to other admins:', e);
          }

          // 4. Thông báo cho nhân viên mượn thẻ nếu có telegram_id
          const { data: empUser } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('id', targetReq.employee_id)
            .maybeSingle();

          const empTelegramId = empUser?.telegram_id;
          if (empTelegramId) {
            await sendTelegramMessage(
              empTelegramId,
              `🎉 <b>YÊU CẦU MƯỢN THẺ ĐÃ ĐƯỢC DUYỆT!</b>\n\n• Mã yêu cầu: <code>${reqId}</code>\n• Thẻ dự kiến: <b>${availableCard.code}</b>\n• Người duyệt: <b>${approverName}</b>\n• Trạng thái: <b>Sẵn sàng nhận thẻ</b>\n\n👉 Bạn vui lòng đến quầy Hành chính gặp Admin để nhận thẻ vật lý trước giờ khởi hành!`
            ).catch(() => {});
          }
        } else {
          // Hết thẻ sẵn sàng trong kho -> Xếp Waitlist
          await supabase.from('requests').update({
            admin_approval_status: 'approved',
            admin_approval_comment: 'Admin đã duyệt (chờ thẻ vào kho)',
            admin_approved_at: now,
            admin_approver_name: approverName,
            is_waitlisted: true,
            status: 'waitlist_cards',
          }).eq('id', reqId);

          await answerCallbackQuery(cb.id, `⏳ Kho hết thẻ trống! Đơn ${reqId} đã được đưa vào danh sách chờ thẻ.`);

          if (cb.message) {
            await editMessageText(
              cb.message.chat.id,
              cb.message.message_id,
              `⏳ <b>ĐÃ DUYỆT (HẾT THẺ - ĐƯA VÀO HÀNG CHỜ)</b>\n\n• Mã yêu cầu: <code>${reqId}</code>\n• Người mượn: <b>${targetReq.employee_name}</b> (<code>${targetReq.employee_code}</code>)\n• Người duyệt: <b>${approverName}</b>\n• Trạng thái: <font color="#f59e0b">Chờ thẻ (Sẽ tự động cấp khi có thẻ trả vào kho)</font>`
            );
          }

          // Broadcast cho các Admin khác
          try {
            const { data: otherAdmins } = await supabase
              .from('users')
              .select('telegram_id, name')
              .in('role', ['admin_hr', 'admin'])
              .not('telegram_id', 'is', null);

            const allAdminIds = new Set([SUPER_ADMIN_ID, ...(otherAdmins || []).map((a) => String(a.telegram_id))]);
            allAdminIds.delete(adminFromId);

            for (const otherAdminId of Array.from(allAdminIds)) {
              if (otherAdminId && otherAdminId.trim()) {
                await sendTelegramMessage(
                  otherAdminId,
                  `ℹ️ <b>THÔNG BÁO DUYỆT ĐƠN (CHỜ THẺ)</b>\n\n• Mã yêu cầu: <code>${reqId}</code> (Nhân sự: <b>${targetReq.employee_name}</b>)\n• Đã được duyệt bởi Admin: <b>${approverName}</b>\n• Trạng thái: <i>Kho hết thẻ - Đang xếp hàng chờ cấp bù</i>`
                ).catch(() => {});
              }
            }
          } catch (e) {
            console.warn('Error broadcasting waitlist to other admins:', e);
          }

          // Thông báo cho nhân viên
          const { data: empUser } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('id', targetReq.employee_id)
            .maybeSingle();

          const empTelegramId = empUser?.telegram_id;
          if (empTelegramId) {
            await sendTelegramMessage(
              empTelegramId,
              `⏳ <b>YÊU CẦU MƯỢN THẺ ĐÃ ĐƯỢC DUYỆT</b>\n\n• Mã yêu cầu: <code>${reqId}</code>\n• Người duyệt: <b>${approverName}</b>\n• Trạng thái: <b>Đang chờ thẻ trống</b>\n\nDo kho thẻ hiện đang được sử dụng hết, yêu cầu của bạn đã được đưa vào danh sách chờ ưu tiên. Khi có thẻ hoàn trả về quầy, hệ thống sẽ tự động gán thẻ và thông báo cho bạn ngay!`
            ).catch(() => {});
          }
        }
      } else if (data.startsWith('reject_req_')) {
        const reqId = data.replace('reject_req_', '');
        const { data: targetReq } = await supabase.from('requests').select('*').eq('id', reqId).maybeSingle();

        if (!targetReq) {
          await answerCallbackQuery(cb.id, '❌ Không tìm thấy yêu cầu mượn thẻ!');
          return res.status(200).json({ ok: true });
        }

        if (targetReq.status !== 'pending_admin' && targetReq.status !== 'pending_leader') {
          await answerCallbackQuery(cb.id, `⚠️ Yêu cầu này đã được xử lý trước đó!`);
          return res.status(200).json({ ok: true });
        }

        const now = new Date().toISOString();
        await supabase.from('requests').update({
          admin_approval_status: 'rejected',
          admin_approval_comment: 'Từ chối nhanh qua Telegram Bot',
          admin_approved_at: now,
          admin_approver_name: approverName,
          status: 'rejected_admin',
        }).eq('id', reqId);

        await answerCallbackQuery(cb.id, `❌ Đã từ chối yêu cầu ${reqId} của ${targetReq.employee_name}!`);

        if (cb.message) {
          await editMessageText(
            cb.message.chat.id,
            cb.message.message_id,
            `❌ <b>ĐÃ TỪ CHỐI YÊU CẦU MƯỢN THẺ!</b>\n\n• Mã yêu cầu: <code>${reqId}</code>\n• Người mượn: <b>${targetReq.employee_name}</b> (<code>${targetReq.employee_code}</code>)\n• Người xử lý: <b>${approverName}</b>\n• Trạng thái: <font color="#ef4444">Từ chối cấp thẻ</font>`
          );
        }

        // Broadcast to other admins
        try {
          const { data: otherAdmins } = await supabase
            .from('users')
            .select('telegram_id, name')
            .in('role', ['admin_hr', 'admin'])
            .not('telegram_id', 'is', null);

          const allAdminIds = new Set([SUPER_ADMIN_ID, ...(otherAdmins || []).map((a) => String(a.telegram_id))]);
          allAdminIds.delete(adminFromId);

          for (const otherAdminId of Array.from(allAdminIds)) {
            if (otherAdminId && otherAdminId.trim()) {
              await sendTelegramMessage(
                otherAdminId,
                `ℹ️ <b>THÔNG BÁO TỪ CHỐI YÊU CẦU TAXI</b>\n\n• Mã yêu cầu: <code>${reqId}</code> (Nhân sự: <b>${targetReq.employee_name}</b>)\n• Đã bị từ chối bởi Admin: <b>${approverName}</b>.`
              ).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('Error broadcasting req rejection to other admins:', e);
        }

        // Thông báo cho nhân viên
        const { data: empUser } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', targetReq.employee_id)
          .maybeSingle();

        const empTelegramId = empUser?.telegram_id;
        if (empTelegramId) {
          await sendTelegramMessage(
            empTelegramId,
            `⚠️ Yêu cầu mượn thẻ Taxi <code>${reqId}</code> của bạn đã bị từ chối bởi Admin <b>${approverName}</b>.\nVui lòng liên hệ ban quản trị nếu có thắc mắc.`
          ).catch(() => {});
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
