import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Don't fail on invalid certs
      rejectUnauthorized: false
    }
  };
  
  // Removed debug logging for production
  
  return nodemailer.createTransport(config);
};

export interface InvitationEmailData {
  toEmail: string;
  workspaceName: string;
  inviterName: string;
  invitationLink?: string;
}

export async function sendWorkspaceInvitation(data: InvitationEmailData): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    
    const mailOptions = {
      from: `"TasksAI Platform" <${fromEmail}>`,
      to: data.toEmail,
      subject: `You've been invited to join ${data.workspaceName} workspace`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">You've been invited to TasksAI!</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555; margin: 0 0 15px 0;">
              Hi there! 👋
            </p>
            
            <p style="font-size: 16px; color: #555; margin: 0 0 15px 0;">
              <strong>${data.inviterName}</strong> has invited you to join the 
              <strong>${data.workspaceName}</strong> workspace on TasksAI.
            </p>
            
            <p style="font-size: 16px; color: #555; margin: 0 0 20px 0;">
              TasksAI is an intelligent task management platform that helps teams organize projects, 
              manage tasks, and collaborate effectively with AI-powered assistance.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.invitationLink || '#'}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
              If the button doesn't work, you can copy and paste this link into your browser:
              <br>
              <a href="${data.invitationLink || '#'}" style="color: #007bff; word-break: break-all;">
                ${data.invitationLink || 'Please contact your workspace administrator'}
              </a>
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              This invitation was sent by TasksAI on behalf of ${data.inviterName}.
              <br>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `
You've been invited to join ${data.workspaceName} workspace on TasksAI!

${data.inviterName} has invited you to join their workspace on TasksAI, an intelligent task management platform.

To accept this invitation, visit: ${data.invitationLink || 'Please contact your workspace administrator'}

If you didn't expect this invitation, you can safely ignore this email.
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent successfully to ${data.toEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}

export interface TaskNotificationEmailData {
  toEmail: string;
  recipientName: string;
  taskTitle: string;
  taskDescription: string;
  notificationType: 'task_assigned' | 'task_completed' | 'comment_added' | 'task_status_changed';
  assignerName?: string;
  commenterName?: string;
  commentText?: string;
  workspaceName?: string;
  statusChange?: {
    from: string;
    to: string;
  };
}

export async function sendTaskNotification(data: TaskNotificationEmailData): Promise<boolean> {
  try {
    const transporter = createTransporter();
    let subject = '';
    let htmlContent = '';
    
    switch (data.notificationType) {
      case 'task_assigned':
        subject = `New Task Assigned: ${data.taskTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">New Task Assigned</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hello ${data.recipientName},
              </p>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                You have been assigned a new task by ${data.assignerName || 'a team member'}:
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${data.taskTitle}</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">${data.taskDescription || 'No description provided'}</p>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Access your TasksAI dashboard to view task details and manage your assignments.
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'task_completed':
        subject = `Task Completed: ${data.taskTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Task Completed</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hello ${data.recipientName},
              </p>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                A task has been completed by ${data.assignerName || 'a team member'}:
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #56ab2f; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${data.taskTitle}</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">${data.taskDescription || 'No description provided'}</p>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Check your TasksAI dashboard to view the completed task and project progress.
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'comment_added':
        subject = `New Comment on Task: ${data.taskTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff7b7b 0%, #667eea 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">New Comment Added</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hello ${data.recipientName},
              </p>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                ${data.commenterName || 'Someone'} added a comment to a task:
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff7b7b; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${data.taskTitle}</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 15px;">
                  <p style="margin: 0; color: #333; font-style: italic;">"${data.commentText || 'No comment text'}"</p>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">— ${data.commenterName}</p>
                </div>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Visit TasksAI to view the full conversation and add your response.
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'task_status_changed':
        const statusLabels = {
          'todo': 'To Do',
          'in_progress': 'In Progress',
          'review': 'Review',
          'completed': 'Completed'
        };
        
        const fromStatus = statusLabels[data.statusChange?.from as keyof typeof statusLabels] || data.statusChange?.from || 'Unknown';
        const toStatus = statusLabels[data.statusChange?.to as keyof typeof statusLabels] || data.statusChange?.to || 'Unknown';
        
        subject = `Task Status Update: ${data.taskTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Task Status Changed</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hello ${data.recipientName},
              </p>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                ${data.assignerName || 'Someone'} has updated the status of a task you're involved with.
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4facfe; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${data.taskTitle}</h3>
                ${data.taskDescription ? `<p style="margin: 0 0 15px 0; color: #666;">${data.taskDescription}</p>` : ''}
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                  <span style="padding: 8px 16px; background: #e9ecef; border-radius: 20px; font-size: 14px; color: #666;">
                    ${fromStatus}
                  </span>
                  <span style="margin: 0 15px; color: #4facfe; font-size: 18px;">→</span>
                  <span style="padding: 8px 16px; background: #4facfe; color: white; border-radius: 20px; font-size: 14px;">
                    ${toStatus}
                  </span>
                </div>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Stay updated on task progress in your ${data.workspaceName || 'workspace'}.
              </p>
            </div>
          </div>
        `;
        break;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL,
      to: data.toEmail,
      subject: subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Task notification email sent to ${data.toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send task notification email:', error);
    return false;
  }
}