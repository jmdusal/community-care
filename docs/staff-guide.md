# Guide for facility staff and facility admins

[← Documentation index](README.md)

A short guide for people who keep a facility's information and appointments up to date.

## Signing in
1. Go to the admin console and sign in with your email and password.
2. Facility admins (and other admins): enter the 6-digit code we email you (or from your authenticator app). The first time, you choose how to get codes and save 8 recovery codes somewhere safe.
3. Tick "Keep me signed in" only on your own device.

## Your facility
- **Facilities** shows only the facilities you are assigned to. Click one to see its details.
- **Edit** to correct details (hours, phone, services, location). Your change goes to a second person to approve before the public sees it. Facility admins can approve their staff's changes, never their own.
- **Data quality** lists what is missing for your facility. Fix those first: map position, a public phone number, opening hours and listed services.

## Appointments (if your facility is in the booking pilot)
- **Appointments → Schedule**: add the times you can see people (days, hours, length of each slot, how many people per slot).
- **Appointments → Requests**: new requests appear here (and the bell rings). **Confirm** or **Decline** with a short reason, ideally within one working day. The patient is emailed either way. Call them on the number shown if needed.
- **Upcoming**: confirmed visits. After the visit, mark **Completed** or **No-show**.
- Never write medical details in reasons or notes.

## Facility admins: your team
- **Team & roles** lists the staff at your facilities. **Invite member** adds facility staff; they get an email to set their password.
- **Edit** a staff member to change their details, their facilities (your facilities only) or to suspend them. **Reset two-factor** helps someone who lost their phone.
- Other roles (verifiers, admins) are managed by a system admin.

## Help
- Something looks wrong or you are locked out: contact your system administrator.
- In an emergency, the public is always told to call 911. CommunityCare is not an emergency service.

## Walk-in queue

Go to Appointments → **Walk-in queue**. Choose one facility in the top bar first.

1. **Add walk-in** gives the next number for today, starting at 001. A name, mobile and service are optional.
2. Type your window, for example "Window 1", and press **Call next**. The lowest waiting number is called to your window.
3. Press **Serving**, then **Done**. Use **⋯** to call a number again, put it back in line, or skip it if the person left. Skipped numbers can go back in line from "Finished today".
4. **Open display screen** opens the full-screen "Now serving" board for a TV or tablet in the waiting area. It shows numbers only, never names. It refreshes itself, and plays a chime once someone taps "Sound on".

### QR check-in for booked patients

Once an appointment is confirmed, the patient sees a check-in QR code. It appears in My appointments (website and app) and on the Check a booking page for guests. The confirmation email tells them where to find it. The code holds only the reference code.

1. In the Walk-in queue, press **Check in booking** (in the app: Clinic → Queue → Check in booking).
2. Scan the patient's QR code with the camera, or type the reference code (for example CC-7KQ2-9MXD). A USB QR scanner also works: it types into the reference box.
3. The patient gets the next queue number, marked "Booked 9:00 AM" in the lists, and is called in order with walk-ins. On their phone the QR code is replaced by their queue number.

Only confirmed appointments for today at this facility can check in. Scanning the same code twice shows the number already given; it does not give a second one. Camera scanning on the website works in Chrome and Edge. In other browsers, type the code or use a USB scanner.

## Booking rules per facility

Go to Appointments → Schedule → **Booking rules**. Facility admins and system admins can set:

- how many requests one person can hold at a time
- the minimum notice before an appointment
- when online cancelling closes

Leave a box empty to use the system default. Closed special days (Facilities → Opening hours → Special days) block online booking on those days automatically.

## Monthly check reminder

On the 1st of every month, staff get one email and a bell notification listing their published facilities that have not been verified for 30 days (Settings → `verification.check_reminder_days`). Check the hours, phones and services, and propose an edit if anything changed.

## Today at this facility

Each morning (or whenever something changes), post what the public should know today:

- **Where:** in the web console, Facilities → open the facility → **Today at this facility**. In the app, Clinic → **Today at …**.
- **What you can set:** doctor in today or not, open as usual / closing early (with the time) / closed, out-of-stock items, and a short note such as "Bring your baby book".
- It shows straight away on the public facility page with "Updated 8:12 AM", and clears itself the next day.

## Reports from the public

Anyone can press **Report wrong information** on a facility page, for example when the phone doesn't work, the hours are wrong, or the facility closed for good. The facility's staff get a bell notification.

1. Open **Review queue → Reports from the public**.
2. Open the facility and fix the information (propose a change).
3. Press **Mark fixed**, or **Dismiss** if the report is wrong. You can add a short note about what you did.
