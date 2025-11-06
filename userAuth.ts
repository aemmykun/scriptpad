// NEVER store tokens in localStorage (XSS vulnerable)
// Use httpOnly cookies instead

// Backend sets secure cookie
function setAuthCookie(res: any, jwtToken: string) {
  res.cookie('auth_token', jwtToken, {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// Frontend makes authenticated requests
fetch('/api/user/profile', {
  credentials: 'include' // Include cookies
});

// Check if student verification expired (revalidate yearly)
interface User {
    id: string;
    isStudent: boolean;
    studentVerifiedAt: string | Date;
    firstName?: string;
    lastName?: string;
    email?: string;
    university?: string;
}

interface Database {
    users: {
        findUnique: (options: { where: { id: string } }) => Promise<User>;
    };
}

declare const db: Database;

async function checkStudentStatus(userId: string): Promise<boolean> {
    const user = await db.users.findUnique({ where: { id: userId } });
    
    if (user.isStudent) {
        const verifiedDate = new Date(user.studentVerifiedAt);
        const now = new Date();
        const daysSinceVerification = (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceVerification > 365; // More than 1 year
    }
    
    return false;
}

// Verify student with SheerID
async function verifyStudent(user: User) {
  const response = await fetch('https://services.sheerid.com/verify', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_SHEERID_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      programId: 'YOUR_PROGRAM_ID',
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      organization: user.university,
      verificationTypeIds: ['STUDENT_STATUS']
    })
  });
  
  const data = await response.json();
  
  if (data.status === 'VERIFIED') {
    // Grant 50% discount
    await applyStudentDiscount(user.id);
    return true;
  }
  
  return false;
}

// Manifest file
// Update user's student status and apply discount
async function applyStudentDiscount(id: string): Promise<void> {
    await db.users.findUnique({ where: { id } });
    
    // Update user record with student status and verification timestamp
    // In a real implementation, you would:
    // 1. Update isStudent to true
    // 2. Set studentVerifiedAt to current date
    // 3. Apply 50% discount to user's subscription/pricing tier
    // 4. Send confirmation email
    
    console.log(`Applied 50% student discount for user ${id}`);
}
