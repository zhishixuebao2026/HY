#include <stdlib.h>
#include <time.h>
void PR_Init(int t,int p,int m){(void)t;(void)p;(void)m;}
long long PR_Now(void){struct timespec ts;clock_gettime(CLOCK_REALTIME,&ts);return (long long)ts.tv_sec*1000000LL+ts.tv_nsec/1000;}
int PR_GetError(void){return -1;}
char *PR_GetErrorText(void){return (char*)"";}
int PR_GetErrorTextLength(void){return 0;}
int PR_GetOSError(void){return 0;}
typedef struct{void*data;unsigned len;int type;int unused;}SECItem;
int NSS_InitReadWrite(const char*d){(void)d;return -1;}
int NSS_NoDB_Init(const char*d){(void)d;return -1;}
int NSS_SetAlgorithmPolicy(int a,int f,int mn,int mx){(void)a;(void)f;(void)mn;(void)mx;return -1;}
int NSS_VersionCheck(const char*v){(void)v;return 0;}
void *CERT_CreateSubjectCertList(void){return NULL;}
void CERT_DestroyCertList(void*l){(void)l;}
void CERT_DestroyCertificate(void*c){(void)c;}
void *CERT_DupCertificate(void*c){(void)c;return NULL;}
void *CERT_FindCertByDERCert(void*h,void*d){(void)h;(void)d;return NULL;}
int CERT_GetCertTrust(void*c,void*t){(void)c;(void)t;return -1;}
void *CERT_GetDefaultCertDB(void){return NULL;}
int CERT_IsUserCert(void*c){(void)c;return 0;}
void PK11_DestroyGenericObjects(void*o){(void)o;}
void *PK11_FindCertInSlot(void*s,void*c){(void)s;(void)c;return NULL;}
void *PK11_FindGenericObjects(void*s,int t){(void)s;(void)t;return NULL;}
void PK11_FreeSlot(void*s){(void)s;}
void *PK11_GetInternalKeySlot(void){return NULL;}
void *PK11_GetModule(void*s){(void)s;return NULL;}
void *PK11_GetNextGenericObject(void*o){(void)o;return NULL;}
char *PK11_GetTokenName(void*s){(void)s;return (char*)"";}
int PK11_HasAttributeSet(void*o,int t){(void)o;(void)t;return 0;}
int PK11_HasRootCerts(void*m){(void)m;return 0;}
int PK11_InitPin(void*s,const char*p,const char*n){(void)s;(void)p;(void)n;return -1;}
int PK11_IsPresent(void*s){(void)s;return 0;}
void *PK11_ListCerts(int t,void*p){(void)t;(void)p;return NULL;}
void *PK11_ListCertsInSlot(void*s){(void)s;return NULL;}
int PK11_NeedUserInit(void*s){(void)s;return 0;}
int PK11_ReadRawAttribute(int t,void*o,int a,SECItem*r){(void)t;(void)o;(void)a;(void)r;return -1;}
void *PK11_ReferenceSlot(void*s){(void)s;return NULL;}
void PK11_SetPasswordFunc(void*f){(void)f;}
SECItem *SECITEM_AllocItem(void*a,SECItem*i,unsigned l){(void)a;(void)i;(void)l;return NULL;}
void SECITEM_FreeItem(SECItem*i,int f){(void)i;(void)f;}
void SECMOD_DestroyModule(void*m){(void)m;}
void *SECMOD_GetDefaultModuleList(void){return NULL;}
void *SECMOD_GetDefaultModuleListLock(void){return NULL;}
void *SECMOD_GetReadLock(void){return NULL;}
void *SECMOD_LoadUserModule(void*m,void*p,int r){(void)m;(void)p;(void)r;return NULL;}
void SECMOD_ReleaseReadLock(void*l){(void)l;}
